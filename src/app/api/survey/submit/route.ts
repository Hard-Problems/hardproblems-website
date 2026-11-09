import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  clientIp,
  isAllowedOrigin,
  looksLikeBot,
  rateLimit
} from '../../../../lib/alerts/http';
import {
  SURVEY_RATE_LIMIT_PER_MINUTE,
  SURVEY_RATE_LIMIT_PREFIX,
  isAllowedByRateLimit
} from '../../../../lib/alerts/rate-limit';
import { alertsDb } from '../../../../lib/alerts/supabase';
import { logError } from '../../../../lib/posthog-server';
import { COUNTRY_NAMES } from '../../../../lib/countries';
import { getSurvey, isOpen, normalizeSource } from '../../../../lib/survey';
import { PREVIEW_SOURCE, hasEarlyAccess } from '../../../../lib/survey/preview';
import {
  DEFAULT_LANGUAGE,
  findLanguage
} from '../../../../lib/survey/i18n/languages';
import {
  normalizeAnswers,
  validateSubmission,
  type Answers
} from '../../../../lib/survey/validate';

// POST /api/survey/submit
// Body: { year, answers, source?, language?, hp? }
//
// `language` is the code of the language the respondent was reading
// (lib/survey/i18n/languages.ts). Only a known code is stored; anything
// else is stored as English, the language the form falls back to.
//
// Stores one anonymous response in `survey_responses` and returns its
// token, the row's random key.
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
//     no email address is collected with it: the newsletter signup on
//     the thank-you screen is the ordinary one, kept separate.

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
  const upstashOk = await isAllowedByRateLimit(
    ip,
    SURVEY_RATE_LIMIT_PREFIX,
    SURVEY_RATE_LIMIT_PER_MINUTE
  );
  if (!upstashOk || !rateLimit(`survey:${ip}`, SURVEY_RATE_LIMIT_PER_MINUTE)) {
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
  // deadline would otherwise still be able to post after it. Before
  // opening, the team's early-access code lets a response through —
  // stored as test data (see preview.ts).
  const earlyAccess = !isOpen(survey) && hasEarlyAccess(survey, payload.access);
  if (!isOpen(survey) && !earlyAccess) {
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
  const linkSource = normalizeSource(
    typeof payload.source === 'string' ? payload.source : ''
  );
  // Early-access responses are always labelled as tests, and nobody
  // else can claim that label — a link carrying ?source=internal-preview
  // would otherwise get a real response deleted with the test data.
  const source = earlyAccess
    ? PREVIEW_SOURCE
    : linkSource === PREVIEW_SOURCE
      ? ''
      : linkSource;
  const language = findLanguage(payload.language)?.code ?? DEFAULT_LANGUAGE;
  const token = randomUUID();

  // alertsDb() THROWS when Supabase is unconfigured rather than
  // returning null, so the whole write is wrapped: an unhandled throw
  // here would be a bare 500, and the respondent has just spent five
  // minutes answering.
  try {
    const row = {
      token,
      survey_year: survey.year,
      answers: clean,
      source: source || null,
      language,
      submitted_at: new Date().toISOString()
    };
    let { error } = await alertsDb().from('survey_responses').insert(row);
    // A database without the `language` column yet (supabase/survey.sql
    // adds it). Losing a response over a missing column would be far
    // worse than losing its language, so store it without, and log
    // loudly so the column gets added.
    if (error && /language/i.test(error.message)) {
      logError(
        'survey/submit: no language column, stored without it',
        new Error(error.message),
        { year: survey.year }
      );
      const { language: _dropped, ...withoutLanguage } = row;
      void _dropped;
      ({ error } = await alertsDb()
        .from('survey_responses')
        .insert(withoutLanguage));
    }
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
