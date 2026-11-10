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
import { COUNTRY_NAMES } from '../../../../lib/countries';
import {
  ACTIONS,
  EXPERIENCE,
  INTEREST,
  LAST_JOB_SEARCH,
  ROLES,
  SESSION_TIMES,
  TOOK_ACTION,
  YES_NO,
  isInterested,
  isValidTimeZone,
  sessionDates,
  slotLabel
} from '../../../../lib/research/screening';

// POST /api/research/screening
//
// Stores a participant screening response from /research/job-board in
// `research_screening_responses` (Supabase) and pings the private forms
// channel in Slack. Same origin / bot / rate-limit stack as the other
// public form routes.

const MAX_SHORT = 200;
const MAX_LONG = 4000;

function pick(rec: Record<string, unknown>, key: string): string {
  const v = rec[key];
  return typeof v === 'string' ? v.trim() : '';
}

function pickList(rec: Record<string, unknown>, key: string): string[] {
  const v = rec[key];
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x): x is string => typeof x === 'string'))];
}

function oneOf(value: string, allowed: readonly string[]): boolean {
  return allowed.includes(value);
}

function allOf(values: string[], allowed: readonly string[]): boolean {
  return values.every((v) => allowed.includes(v));
}

function bad(error: string) {
  return NextResponse.json({ ok: false, error }, { status: 400 });
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
    return bad('Invalid request.');
  }
  const rec = (body ?? {}) as Record<string, unknown>;

  if (typeof rec.hp === 'string' && rec.hp.trim()) {
    return NextResponse.json({ ok: true });
  }

  const visited = pick(rec, 'visited');
  const role = pick(rec, 'role');
  const roleOther = pick(rec, 'roleOther').slice(0, MAX_SHORT);
  const experience = pick(rec, 'experience');
  const country = pick(rec, 'country');
  const lastSearch = pick(rec, 'lastSearch');
  const tookAction = pick(rec, 'tookAction');
  const actions = pickList(rec, 'actions');
  const actionOther = pick(rec, 'actionOther').slice(0, MAX_SHORT);
  const interest = pick(rec, 'interest');
  const email = pick(rec, 'email');
  const comments = pick(rec, 'comments').slice(0, MAX_LONG);
  const date = pick(rec, 'date');
  const time = pick(rec, 'time');
  const timeZone = pick(rec, 'timeZone').slice(0, 100);
  const consent = rec.consent === true;

  if (!oneOf(visited, YES_NO))
    return bad('Please tell us whether you’ve visited the job board.');
  if (!oneOf(role, ROLES))
    return bad('Please choose your current professional role.');
  if (role === 'Other' && !roleOther)
    return bad('Please specify your professional role.');
  if (!oneOf(experience, EXPERIENCE))
    return bad('Please choose your years of professional experience.');
  if (!oneOf(country, COUNTRY_NAMES))
    return bad('Please choose the country you’re based in.');
  if (!oneOf(lastSearch, LAST_JOB_SEARCH))
    return bad('Please tell us when you last looked for a job.');
  if (!oneOf(tookAction, TOOK_ACTION))
    return bad(
      'Please tell us whether you’ve acted on an opportunity from Hard Problems.'
    );
  if (tookAction === 'Yes') {
    if (actions.length === 0 || !allOf(actions, ACTIONS))
      return bad('Please tell us what you did with the opportunity.');
    if (actions.includes('Other') && !actionOther)
      return bad('Please specify what else you did.');
  }
  if (!oneOf(interest, INTEREST))
    return bad('Please tell us whether you’d like to join a research session.');

  const interested = isInterested(interest);
  // Dates offered as of yesterday too, so someone who loaded the page
  // just before midnight UTC isn't rejected when "tomorrow" moves on.
  const now = new Date();
  const offered = new Set(
    [
      ...sessionDates(new Date(now.getTime() - 24 * 60 * 60 * 1000)),
      ...sessionDates(now)
    ].map((d) => d.label)
  );
  const hasSlot = interested && date !== '';
  if (interested) {
    if (email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email))
      return bad('Please enter a valid email address so we can get in touch.');
    if (date && !offered.has(date))
      return bad('That date is no longer available. Please choose another.');
    if (sessionDates(now).length > 0 && !date)
      return bad('Please choose a date for your session.');
    if (hasSlot) {
      if (!oneOf(time, SESSION_TIMES))
        return bad('Please choose a start time for your session.');
      if (!isValidTimeZone(timeZone))
        return bad('Please choose your time zone.');
    }
    if (!consent) return bad('Please tick the box to agree to be contacted.');
  }

  const row = {
    visited_job_board: visited,
    role,
    role_other: role === 'Other' ? roleOther : null,
    experience,
    country,
    last_job_search: lastSearch,
    took_action: tookAction,
    actions: tookAction === 'Yes' ? actions : [],
    action_other:
      tookAction === 'Yes' && actions.includes('Other') ? actionOther : null,
    research_interest: interest,
    email: interested ? email : null,
    contact_consent: interested ? consent : false,
    available_days: hasSlot ? [date] : [],
    available_times: hasSlot ? [slotLabel(date, time)] : [],
    time_zone: hasSlot ? timeZone : null,
    comments: comments || null
  };

  try {
    const { error } = await alertsDb()
      .from('research_screening_responses')
      .insert(row);
    if (error) throw new Error(error.message);
  } catch (err) {
    logError('[research/screening] db insert failed', err, { role, country });
    return NextResponse.json(
      {
        ok: false,
        error: "We couldn't save your response right now. Please try again."
      },
      { status: 502 }
    );
  }

  try {
    const roleLine = role === 'Other' ? `Other: ${roleOther}` : role;
    const lines = [
      `:mag: *New research screening response*`,
      `*Role:* ${roleLine} · ${experience} · ${country}`,
      `*Visited job board:* ${visited} · *Acted on a job:* ${tookAction}`,
      `*Last job search:* ${lastSearch}`,
      `*Interest:* ${interest}`
    ];
    if (interested) {
      lines.push(`*Email:* ${email}`);
      if (hasSlot) lines.push(`*Session:* ${date}, ${time} (${timeZone})`);
    }
    if (comments) lines.push(`*Comments:* ${comments}`);
    await postToSlackForms({ text: lines.join('\n'), unfurl_links: false });
  } catch (err) {
    logError('[research/screening] slack post failed', err, { role });
  }

  return NextResponse.json({ ok: true });
}
