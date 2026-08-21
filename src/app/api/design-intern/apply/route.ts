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
import { postToSlackJobApplicants } from '../../../../lib/slack';
import { validateAndNormalizeUrl } from '../../../../lib/validateUrl';
import { logError } from '../../../../lib/posthog-server';

// POST /api/design-intern/apply
// Body: {
//   fullName, email, location,
//   portfolioUrl, writingExampleUrl?, linkedinOrCvUrl,
//   whyRole, proudestProject, dreamJob,
//   rightToWorkUk: 'yes' | 'no',
//   availableSchedule: 'yes' | 'no' | 'other',
//   availableScheduleOther?: string,       // required if availableSchedule === 'other'
//   availableFullTerm: 'yes' | 'no',
//   hp?
// }
//
// Stores the application in `design_intern_applications` (Supabase)
// and pings the private forms channel in Slack. Same origin / bot /
// rate-limit stack as the other public form routes.

const MAX_NAME = 200;
const MAX_LOCATION = 200;
const MAX_URL = 2048;
const MAX_LONG = 4000;

function pick(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === 'string' ? v.trim() : '';
}

function parseYesNo(raw: string): boolean | null {
  const v = raw.trim().toLowerCase();
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return null;
}

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
  const rec = (body ?? {}) as Record<string, unknown>;

  // Honeypot — real users leave `hp` blank.
  if (typeof rec.hp === 'string' && rec.hp.trim()) {
    return NextResponse.json({ ok: true });
  }

  const fullName = pick(rec, 'fullName').slice(0, MAX_NAME);
  const email = pick(rec, 'email');
  const location = pick(rec, 'location').slice(0, MAX_LOCATION);
  const portfolioUrl = pick(rec, 'portfolioUrl').slice(0, MAX_URL);
  const writingExampleUrl = pick(rec, 'writingExampleUrl').slice(0, MAX_URL);
  const linkedinOrCvUrl = pick(rec, 'linkedinOrCvUrl').slice(0, MAX_URL);
  const whyRole = pick(rec, 'whyRole').slice(0, MAX_LONG);
  const proudestProject = pick(rec, 'proudestProject').slice(0, MAX_LONG);
  const dreamJob = pick(rec, 'dreamJob').slice(0, MAX_LONG);
  const rightToWorkRaw = pick(rec, 'rightToWorkUk');
  const availableScheduleRaw = pick(rec, 'availableSchedule');
  const availableScheduleOther = pick(rec, 'availableScheduleOther').slice(
    0,
    MAX_LONG
  );
  const availableRaw = pick(rec, 'availableFullTerm');

  if (!fullName) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your name.' },
      { status: 400 }
    );
  }
  if (
    !email ||
    email.length > MAX_EMAIL_LENGTH ||
    !EMAIL_RE.test(email)
  ) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }
  if (!location) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your location.' },
      { status: 400 }
    );
  }

  const portfolioCheck = validateAndNormalizeUrl(portfolioUrl);
  if (!portfolioCheck.ok) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid portfolio URL.' },
      { status: 400 }
    );
  }
  const normalizedPortfolioUrl = portfolioCheck.url;

  // Optional URLs — if present, must be valid; if empty, allowed.
  let normalizedWritingUrl: string | null = null;
  if (writingExampleUrl) {
    const c = validateAndNormalizeUrl(writingExampleUrl);
    if (!c.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Please enter a valid URL for your writing example.'
        },
        { status: 400 }
      );
    }
    normalizedWritingUrl = c.url;
  }
  const linkedinCheck = validateAndNormalizeUrl(linkedinOrCvUrl);
  if (!linkedinCheck.ok) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid LinkedIn or CV URL.' },
      { status: 400 }
    );
  }
  const normalizedLinkedinOrCvUrl = linkedinCheck.url;

  if (!whyRole) {
    return NextResponse.json(
      { ok: false, error: 'Please tell us why you want the role.' },
      { status: 400 }
    );
  }
  if (!proudestProject) {
    return NextResponse.json(
      {
        ok: false,
        error: "Please share a project you're most proud of."
      },
      { status: 400 }
    );
  }
  if (!dreamJob) {
    return NextResponse.json(
      { ok: false, error: 'Please describe your dream role.' },
      { status: 400 }
    );
  }

  const rightToWorkUk = parseYesNo(rightToWorkRaw);
  if (rightToWorkUk === null) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Please confirm whether you have the right to work in the UK.'
      },
      { status: 400 }
    );
  }
  const scheduleAllowed = new Set(['yes', 'no', 'other']);
  const availableSchedule = availableScheduleRaw.trim().toLowerCase();
  if (!scheduleAllowed.has(availableSchedule)) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Please tell us whether you are available for a few hours, 5 days per week.'
      },
      { status: 400 }
    );
  }
  if (availableSchedule === 'other' && !availableScheduleOther) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Please tell us about your availability.'
      },
      { status: 400 }
    );
  }
  // Keep the "other" text only when the radio actually says "other"
  // — a stale value from an earlier UI state shouldn't leak into
  // storage.
  const scheduleOtherToStore =
    availableSchedule === 'other' ? availableScheduleOther : null;
  const availableFullTerm = parseYesNo(availableRaw);
  if (availableFullTerm === null) {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Please confirm whether you are available for the full 9-month term.'
      },
      { status: 400 }
    );
  }

  // Insert first — Slack is a nice-to-have; failing Slack should not
  // cost us the applicant's data. Slack failure only triggers a warn
  // log, not a 5xx.
  try {
    const { error } = await alertsDb()
      .from('design_intern_applications')
      .insert({
        full_name: fullName,
        email,
        location,
        portfolio_url: normalizedPortfolioUrl,
        writing_example_url: normalizedWritingUrl,
        linkedin_or_cv_url: normalizedLinkedinOrCvUrl,
        why_role: whyRole,
        proudest_project: proudestProject,
        dream_job: dreamJob,
        right_to_work_uk: rightToWorkUk,
        available_schedule: availableSchedule,
        available_schedule_other: scheduleOtherToStore,
        available_full_term: availableFullTerm
      });
    if (error) throw new Error(error.message);
  } catch (err) {
    logError('[design-intern/apply] db insert failed', err, {
      email,
      fullName
    });
    return NextResponse.json(
      {
        ok: false,
        error:
          "We couldn't save your application right now. Please try again."
      },
      { status: 502 }
    );
  }

  // Slack ping — failure logged, user still sees success.
  const writingLine = normalizedWritingUrl
    ? `\n*Writing sample:* ${normalizedWritingUrl}`
    : '';
  const linkedinLine = `\n*LinkedIn / CV:* ${normalizedLinkedinOrCvUrl}`;
  try {
    await postToSlackJobApplicants({
      text:
        `:page_facing_up: *New Design intern application*\n` +
        `*Name:* ${fullName} <${email}>\n` +
        `*Location:* ${location}\n` +
        `*Portfolio:* ${normalizedPortfolioUrl}` +
        writingLine +
        linkedinLine +
        `\n*Right to work in UK:* ${rightToWorkUk ? 'Yes' : 'No'}` +
        `\n*Available few-hours × 5-days/week:* ${
          scheduleOtherToStore
            ? `Other — ${scheduleOtherToStore}`
            : availableSchedule
        }` +
        `\n*Available for full 9 months:* ${availableFullTerm ? 'Yes' : 'No'}` +
        `\n\n*Why the role:* ${whyRole}` +
        `\n\n*Proudest project:* ${proudestProject}` +
        `\n\n*Dream job:* ${dreamJob}`,
      unfurl_links: false
    });
  } catch (err) {
    logError('[design-intern/apply] slack post failed', err, { email });
  }

  return NextResponse.json({ ok: true });
}
