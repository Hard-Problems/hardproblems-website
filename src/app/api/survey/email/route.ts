import { NextResponse } from 'next/server';
import {
  EMAIL_RE,
  MAX_EMAIL_LENGTH,
  clientIp,
  isAllowedOrigin,
  looksLikeBot,
  rateLimit
} from '../../../../lib/alerts/http';
import { isAllowedByRateLimit } from '../../../../lib/alerts/rate-limit';
import { alertsDb } from '../../../../lib/alerts/supabase';
import { logError } from '../../../../lib/posthog-server';
import { getSurvey } from '../../../../lib/survey';

// POST /api/survey/email
// Body: { year, token, email, newsletter }
//
// Attaches an email address to a response that has already been stored,
// so the respondent can be sent the report.
//
// Why this is a SEPARATE table and a separate request:
//
//   - the answers are submitted and saved before an address is asked
//     for, so someone who declines still counts;
//   - GDPR data minimisation. The response row carries no identifier.
//     The address lives in `survey_report_signups` keyed by the same
//     token, so the two can be joined only deliberately, and the
//     address can be deleted without touching the anonymous answers;
//   - consent for the newsletter is a separate lawful basis from the
//     survey itself, and recording it separately is what makes that
//     demonstrable.
//
// On the pre-ticked box: the brief asked for the newsletter opt-in to
// default to checked. UK GDPR requires consent to be a clear
// affirmative action, and the ICO is explicit that pre-ticked boxes do
// not qualify — so the form ships it unticked and this route records
// whatever it is sent. Flip the default in SurveyForm if that decision
// changes.

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 403 }
    );
  }
  if (looksLikeBot(request)) {
    return NextResponse.json({ ok: true });
  }

  const ip = clientIp(request);
  const upstashOk = await isAllowedByRateLimit(ip);
  if (!upstashOk || !rateLimit(ip)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again shortly.' },
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

  // The token proves the sender just completed a response. It is a v4
  // UUID generated server-side and returned only to that respondent, so
  // this both links the address to the right row and stops the endpoint
  // being used as an open mailing-list injector.
  const token = typeof payload.token === 'string' ? payload.token.trim() : '';
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(token)) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.' },
      { status: 400 }
    );
  }

  const email =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  const newsletter = payload.newsletter === true;

  try {
    const { error } = await alertsDb().from('survey_report_signups').upsert(
      {
        token,
        survey_year: survey.year,
        email,
        newsletter_consent: newsletter,
        // Recorded because demonstrating WHEN consent was given is
        // part of being able to demonstrate it at all.
        consented_at: new Date().toISOString()
      },
      { onConflict: 'token' }
    );
    if (error) throw new Error(error.message);
  } catch (err) {
    logError('survey/email: could not store signup', err, {
      year: survey.year
    });
    return NextResponse.json(
      { ok: false, error: 'We could not save that. Please try again.' },
      { status: 503 }
    );
  }

  // Newsletter subscription itself is deliberately NOT done here. The
  // site already has /api/subscribe, which handles Beehiiv and the
  // double opt-in that goes with it; duplicating that would create a
  // second path into the list with different consent handling. Wiring
  // the two together is the next step.

  return NextResponse.json({ ok: true });
}
