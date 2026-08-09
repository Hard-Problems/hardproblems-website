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
import { postToSlackForms } from '../../../../lib/slack';
import { logError } from '../../../../lib/posthog-server';

// POST /api/coworking/apply
// Body: {
//   email, fullName, deskType, profileUrl,
//   hardProblem, organization?, note?, hp?
// }
//
// Stores the application in `desk_applications` (Supabase) and pings
// the private forms channel in Slack. Same origin / bot / rate-limit
// stack as the alerts + job-submit routes.

const MAX_NAME = 200;
const MAX_URL = 2048;
const MAX_LONG = 4000;

// Values the modal's dropdown offers. Anything outside this set is a
// bot or a malformed client; reject rather than store unknown types.
const DESK_TYPES: readonly string[] = [
  'Free long-term desk',
  'Drop-in desk for 1-5 days',
  'Drop-in desk for more than 5 days'
];

function pick(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === 'string' ? v.trim() : '';
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

  const email = pick(rec, 'email');
  const fullName = pick(rec, 'fullName').slice(0, MAX_NAME);
  const profileUrl = pick(rec, 'profileUrl').slice(0, MAX_URL);
  const deskType = pick(rec, 'deskType');
  const hardProblem = pick(rec, 'hardProblem').slice(0, MAX_LONG);
  const organization = pick(rec, 'organization').slice(0, MAX_NAME);
  const note = pick(rec, 'note').slice(0, MAX_LONG);

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }
  if (!fullName) {
    return NextResponse.json(
      { ok: false, error: 'Please enter your name.' },
      { status: 400 }
    );
  }
  if (!profileUrl) {
    return NextResponse.json(
      { ok: false, error: 'Please add a LinkedIn or website URL.' },
      { status: 400 }
    );
  }
  if (!DESK_TYPES.includes(deskType)) {
    return NextResponse.json(
      { ok: false, error: 'Please choose the type of desk you are applying for.' },
      { status: 400 }
    );
  }
  if (!hardProblem) {
    return NextResponse.json(
      { ok: false, error: 'Please tell us what hard problem you work on.' },
      { status: 400 }
    );
  }

  // Insert first — Slack is a nice-to-have; failing Slack should not
  // cost us the applicant's data. Slack failure only triggers a warn
  // log, not a 5xx.
  try {
    const { error } = await alertsDb().from('desk_applications').insert({
      email,
      full_name: fullName,
      profile_url: profileUrl,
      desk_type: deskType,
      hard_problem: hardProblem,
      organization: organization || null,
      note: note || null,
      source: 'website'
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    logError('[coworking/apply] db insert failed', err, {
      email,
      deskType
    });
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't save your application right now. Please try again."
      },
      { status: 502 }
    );
  }

  // Slack ping — fire-and-forget in the sense that a Slack failure
  // still leaves the user with a stored application. We log the
  // failure so we can chase it, but return 200 to the user.
  const orgLine = organization ? `\n*Organization:* ${organization}` : '';
  const noteLine = note ? `\n*Note:* ${note}` : '';
  try {
    await postToSlackForms({
      text:
        `:office: *New coworking desk application*\n` +
        `*Name:* ${fullName} <${email}>\n` +
        `*Profile:* ${profileUrl}\n` +
        `*Type:* ${deskType}\n` +
        `*Hard problem:* ${hardProblem}` +
        orgLine +
        noteLine,
      unfurl_links: false
    });
  } catch (err) {
    logError('[coworking/apply] slack post failed', err, { email });
  }

  return NextResponse.json({ ok: true });
}
