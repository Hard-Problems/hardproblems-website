import { NextResponse } from 'next/server';
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
import { getSurvey } from '../../../../lib/survey';
import { BONUS_WINDOW_MS } from '../../../../lib/survey/bonus';
import {
  normalizeAnswers,
  validateBonus,
  type Answers
} from '../../../../lib/survey/validate';

// POST /api/survey/bonus
// Body: { year, token, answers }
//
// Adds bonus-round answers to a response that has already been sent
// (see lib/survey/bonus.ts). The main answers are submitted first, so
// someone who leaves at the bonus round has lost nothing else.
//
// What stops this being a way to tamper with responses:
//   - the token is the response row's random key, returned only to the
//     browser that sent it, and kept only in that tab's memory;
//   - it works only for BONUS_WINDOW_MS after the response was sent;
//   - only bonus questions are accepted (validateBonus), with the same
//     length and character checks as everywhere else — so the answers
//     already given cannot be rewritten through here.
// Plus the same origin, bot and rate-limit checks as the submit route.

export const dynamic = 'force-dynamic';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function invalid(status = 400) {
  return NextResponse.json(
    { ok: false, error: 'Invalid request.' },
    { status }
  );
}

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return invalid(403);
  if (looksLikeBot(request)) return NextResponse.json({ ok: true });

  const ip = clientIp(request);
  const upstashOk = await isAllowedByRateLimit(
    ip,
    SURVEY_RATE_LIMIT_PREFIX,
    SURVEY_RATE_LIMIT_PER_MINUTE
  );
  if (!upstashOk || !rateLimit(`survey:${ip}`, SURVEY_RATE_LIMIT_PER_MINUTE)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalid();
  }
  if (typeof body !== 'object' || body === null) return invalid();
  const payload = body as Record<string, unknown>;

  const survey = getSurvey(
    typeof payload.year === 'number' || typeof payload.year === 'string'
      ? payload.year
      : ''
  );
  if (!survey) return invalid(404);

  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  if (!UUID_RE.test(token)) return invalid();

  const answers = payload.answers;
  if (
    typeof answers !== 'object' ||
    answers === null ||
    Array.isArray(answers)
  ) {
    return invalid();
  }

  const errors = validateBonus(survey, answers as Answers);
  if (errors.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Some answers could not be accepted.',
        fields: errors
      },
      { status: 400 }
    );
  }

  const clean = normalizeAnswers(survey, answers as Answers);
  if (Object.keys(clean).length === 0) return NextResponse.json({ ok: true });

  try {
    const { data, error } = await alertsDb()
      .from('survey_responses')
      .select('answers, submitted_at')
      .eq('token', token)
      .eq('survey_year', survey.year)
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Same response for "no such response" and "too late", so the
    // route cannot be used to probe for tokens.
    if (
      !data ||
      Date.now() - Date.parse(data.submitted_at as string) > BONUS_WINDOW_MS
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'These can no longer be added to your answers. Thank you all the same.'
        },
        { status: 410 }
      );
    }

    const { error: updateError } = await alertsDb()
      .from('survey_responses')
      .update({
        answers: { ...(data.answers as Answers), ...clean }
      })
      .eq('token', token)
      .eq('survey_year', survey.year);
    if (updateError) throw new Error(updateError.message);
  } catch (err) {
    logError('survey/bonus: could not add answers', err, {
      year: survey.year
    });
    return NextResponse.json(
      { ok: false, error: 'We could not save these. Please try again.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
