import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  clientIp,
  isAllowedOrigin,
  looksLikeBot,
  rateLimit
} from '../../../../lib/alerts/http';
import {
  SURVEY_RATE_LIMIT_PREFIX,
  isAllowedByRateLimit
} from '../../../../lib/alerts/rate-limit';
import { alertsDb } from '../../../../lib/alerts/supabase';
import { logError } from '../../../../lib/posthog-server';
import { COUNTRY_NAMES } from '../../../../lib/countries';
import { getSurvey, isOpen, normalizeSource } from '../../../../lib/survey';
import {
  normalizeAnswers,
  validateSubmission,
  type Answers
} from '../../../../lib/survey/validate';

// POST /api/survey/submit
// Body: { year, answers, source?, hp? }
//
// Stores one anonymous response in `survey_responses` and returns a
// token the respondent can use to attach an email address afterwards
// (see ../email) or to ask us to delete their response.
//
// Security, in order of what each step stops:
//
//   isAllowedOrigin   a form posted from somebody else's page
//   looksLikeBot      the honeypot field, filled in only by scripts
//   rate limiting     bulk submission, both per-instance and in Redis
//   isOpen            a page loaded before the deadline, posted after
//   validateSubmission  everything else — see validate.ts. An answer is
//                     accepted only if the year's definition declares
//                     the question AND the option id, so no
//                     attacker-chosen string reaches storage except in
//                     fields the definition declares as free text, each
//                     with its own length cap.
//
// GDPR notes:
//   - no IP address is stored. The client IP is used for rate limiting
//     and then discarded; Upstash holds only a counter against it.
//   - the response is anonymous. Nothing here identifies a person, and
//     the email address (if given at all) is written to a different
//     table keyed by the token, so the two are not joined by default.
//   - the token is returned to the respondent and to nobody else, which
//     is what makes erasure possible without us knowing who they are.

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 403 }
    );
  }

  // Silently accepted and dropped: telling a bot it was detected only
  // helps it try again differently.
  if (looksLikeBot(request)) {
    return NextResponse.json({ ok: true, token: '' });
  }

  const ip = clientIp(request);
  // Both limiters are namespaced to the survey: the Upstash one by
  // prefix, the in-memory one by key, so neither shares a budget with
  // the newsletter and job-alert forms.
  const upstashOk = await isAllowedByRateLimit(ip, SURVEY_RATE_LIMIT_PREFIX);
  if (!upstashOk || !rateLimit(`survey:${ip}`)) {
    return NextResponse.json(
      { ok: false, error: 'Too many submissions. Please try again shortly.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }
  const payload = body as Record<string, unknown>;

  // The honeypot again, this time from the JSON body — the header check
  // above only sees request shape.
  if (typeof payload.hp === 'string' && payload.hp.trim() !== '') {
    return NextResponse.json({ ok: true, token: '' });
  }

  const survey = getSurvey(
    typeof payload.year === 'number' || typeof payload.year === 'string'
      ? payload.year
      : ''
  );
  if (!survey) {
    return NextResponse.json(
      { ok: false, error: 'Unknown survey.' },
      { status: 404 }
    );
  }

  // Checked here as well as in the page: a tab opened before the
  // deadline would otherwise still be able to post after it.
  if (!isOpen(survey)) {
    return NextResponse.json(
      { ok: false, error: 'This survey is closed.' },
      { status: 410 }
    );
  }

  const answers = payload.answers;
  if (
    typeof answers !== 'object' ||
    answers === null ||
    Array.isArray(answers)
  ) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }

  const errors = validateSubmission(survey, answers as Answers, COUNTRY_NAMES);
  if (errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Some answers could not be accepted.',
        // Field-level detail so the form can point at the question. No
        // user input is echoed back, only our own messages.
        fields: errors
      },
      { status: 400 }
    );
  }

  const clean = normalizeAnswers(survey, answers as Answers);
  const source = normalizeSource(
    typeof payload.source === 'string' ? payload.source : ''
  );
  const token = randomUUID();

  // alertsDb() THROWS when Supabase is unconfigured rather than
  // returning null, so the whole write is wrapped: an unhandled throw
  // here would be a bare 500, and the respondent has just spent five
  // minutes answering.
  try {
    const { error } = await alertsDb()
      .from('survey_responses')
      .insert({
        token,
        survey_year: survey.year,
        answers: clean,
        source: source || null,
        submitted_at: new Date().toISOString()
      });
    if (error) throw new Error(error.message);
  } catch (err) {
    logError('survey/submit: could not store response', err, {
      year: survey.year
    });
    return NextResponse.json(
      { ok: false, error: 'We could not save your answers. Please try again.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, token });
}
