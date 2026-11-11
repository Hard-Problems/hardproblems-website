'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import formStyles from '../../jobs/jobSubmit.module.scss';
import styles from './page.module.scss';
import {
  BOOKS,
  EXPERIENCE,
  INTEREST,
  LAST_JOB_SEARCH,
  ROLES,
  SESSION_TIMES,
  TOOK_ACTION,
  YES_NO,
  isInterested,
  wantsSession,
  type SessionDate,
  type TimeZoneOption
} from '../../../lib/research/screening';

// The participant screening form. Client-side checks catch obvious
// slips; /api/research/screening re-checks everything and is the only
// authority.

type Status = 'idle' | 'submitting' | 'sent' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function Required() {
  return (
    <span className={styles.requiredMark} aria-label="required">
      *
    </span>
  );
}

/**
 * One question: an item of the section's <ol>. The visible number comes
 * from that list (see .questions in the SCSS), so a question that is
 * hidden doesn't leave a gap in the numbering.
 */
function Question({
  label,
  hint,
  required,
  children
}: {
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <li className={styles.questionItem}>
      <fieldset className={styles.question}>
        <legend className={styles.legend}>
          {label}
          {required ? (
            <Required />
          ) : (
            <span className={styles.optionalHint}>(optional)</span>
          )}
        </legend>
        {hint && <p className={styles.hint}>{hint}</p>}
        {children}
      </fieldset>
    </li>
  );
}

function Options({
  name,
  options,
  value,
  onChange,
  disabled,
  labels
}: {
  name: string;
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  labels?: Record<string, string>;
}) {
  return (
    <div className={styles.options}>
      {options.map((o) => (
        <label key={o} className={styles.option}>
          <input
            type="radio"
            name={name}
            value={o}
            checked={value === o}
            onChange={() => onChange(o)}
            disabled={disabled}
          />
          <span>{labels?.[o] ?? o}</span>
        </label>
      ))}
    </div>
  );
}

function OtherInput({
  value,
  onChange,
  disabled,
  label
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <span className={`${formStyles.field} ${styles.otherField}`}>
      <input
        type="text"
        aria-label={label}
        placeholder="Please specify"
        value={value}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={formStyles.input}
      />
    </span>
  );
}

/**
 * Q10: one weekday in November, a start time and the time zone that
 * time is in, as three dropdowns side by side.
 */
function TimePicker({
  dates,
  timeZones,
  date,
  time,
  timeZone,
  onDate,
  onTime,
  onTimeZone,
  disabled
}: {
  dates: SessionDate[];
  timeZones: TimeZoneOption[];
  date: string;
  time: string;
  timeZone: string;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  onTimeZone: (v: string) => void;
  disabled: boolean;
}) {
  // The browser's zone may be an alias missing from the server's list.
  const zones =
    timeZone && !timeZones.some((z) => z.value === timeZone)
      ? [{ value: timeZone, label: timeZone.replace(/_/g, ' ') }, ...timeZones]
      : timeZones;
  return (
    <div className={styles.timePicker}>
      <label className={styles.pickerField}>
        <span className={styles.pickerLabel}>Date</span>
        <span className={`${formStyles.field} ${styles.selectField}`}>
          <select
            value={date}
            onChange={(e) => onDate(e.target.value)}
            disabled={disabled}
            className={formStyles.input}
          >
            <option value="">Choose a date</option>
            {dates.map((d) => (
              <option key={d.label} value={d.label}>
                {d.label}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className={styles.pickerField}>
        <span className={styles.pickerLabel}>Start time</span>
        <span className={`${formStyles.field} ${styles.selectField}`}>
          <select
            value={time}
            onChange={(e) => onTime(e.target.value)}
            disabled={disabled}
            className={formStyles.input}
          >
            <option value="">Choose a time</option>
            {SESSION_TIMES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className={`${styles.pickerField} ${styles.pickerZone}`}>
        <span className={styles.pickerLabel}>Time zone</span>
        <span className={`${formStyles.field} ${styles.selectField}`}>
          <select
            value={timeZone}
            onChange={(e) => onTimeZone(e.target.value)}
            disabled={disabled}
            className={formStyles.input}
          >
            <option value="">Choose a time zone</option>
            {zones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </span>
      </label>
    </div>
  );
}

export default function ScreeningForm({
  countries,
  dates,
  timeZones
}: {
  countries: string[];
  dates: SessionDate[];
  timeZones: TimeZoneOption[];
}) {
  const [visited, setVisited] = useState('');
  const [role, setRole] = useState('');
  const [roleOther, setRoleOther] = useState('');
  const [experience, setExperience] = useState('');
  const [country, setCountry] = useState('');
  const [lastSearch, setLastSearch] = useState('');
  const [tookAction, setTookAction] = useState('');
  const [interest, setInterest] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  // Prefill the time zone from the browser; the participant can edit it.
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) setTimeZone((current) => current || tz);
    } catch {
      // Leave it blank — they can pick it.
    }
  }, []);

  useEffect(() => {
    if (status !== 'sent') return;
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [status]);

  const disabled = status === 'submitting';
  const interested = isInterested(interest);
  // "Yes" picks a session time; "Maybe" only leaves an email.
  const booking = wantsSession(interest);
  const hasDates = dates.length > 0;

  function fail(msg: string) {
    setError(msg);
    setStatus('error');
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setError(null);

    if (!visited)
      return fail('Please tell us whether you’ve visited the job board.');
    if (!role) return fail('Please choose your current professional role.');
    if (role === 'Other' && !roleOther.trim())
      return fail('Please specify your professional role.');
    if (!experience)
      return fail('Please choose your years of professional experience.');
    if (!country) return fail('Please choose the country you’re based in.');
    if (!lastSearch)
      return fail('Please tell us when you last looked for a job.');
    if (!interest)
      return fail(
        'Please tell us whether you’d like to join a research session.'
      );
    if (interested) {
      if (!EMAIL_RE.test(email.trim()))
        return fail(
          'Please enter a valid email address so we can get in touch.'
        );
      if (booking && hasDates) {
        if (!date) return fail('Please choose a date for your session.');
        if (!time) return fail('Please choose a start time for your session.');
        if (!timeZone) return fail('Please choose your time zone.');
      }
      if (!consent)
        return fail('Please tick the box to agree to be contacted.');
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/research/screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visited,
          role,
          roleOther,
          experience,
          country,
          lastSearch,
          tookAction,
          interest,
          email: interested ? email : '',
          date: booking ? date : '',
          time: booking ? time : '',
          timeZone: booking ? timeZone : '',
          consent: interested ? consent : false,
          hp: honeypot
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        return fail(data.error || 'Something went wrong. Please try again.');
      }
      setStatus('sent');
    } catch {
      fail('We couldn’t reach the server. Please try again.');
    }
  };

  // The finished screen follows the survey's: the page title becomes
  // "Thank you!" and what happens next sits under plain subheadings,
  // with no tinted box. "Next" depends on how they answered Q7.
  if (status === 'sent') {
    return (
      <div ref={topRef} className={styles.wrap} role="status">
        <h1 className="page-title">Thank you!</h1>
        <div className={styles.done}>
          <p>
            Your answers are in. Thanks for helping us make the Hard Problems
            job board better.
          </p>

          {interested && (
            <>
              <h2 className={styles.doneHeading}>What happens next</h2>
              <p>
                {booking
                  ? 'We’ll email you to confirm your session time, with a calendar invite and a video call link.'
                  : 'We’ll email you with more about the session, so you can decide whether to take part.'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // Consent closes the "Choose a time" section for Yes, and the
  // research section for Maybe.
  const consentBox = (
    <label className={`${styles.option} ${styles.consent}`}>
      <input
        type="checkbox"
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        disabled={disabled}
      />
      <span>
        I agree to be contacted by the Hard Problems team about participating in
        future user research. I understand that providing my contact details
        does not guarantee selection.
        <Required />
      </span>
    </label>
  );

  return (
    <div ref={topRef} className={styles.wrap}>
      <h1 className="page-title">User research form</h1>
      <div className={styles.intro}>
        <p>
          We&rsquo;re learning how people find and evaluate career
          opportunities, so we can make the Hard Problems job board more useful.
        </p>
        <p>
          This short form helps us find the right people to invite to a research
          session. It takes 2–3 minutes. Your answers are kept confidential and
          only used for this research (
          <Link href="/privacy#research">privacy notice</Link>).
        </p>
      </div>

      <aside className={styles.incentive} aria-labelledby="incentive-title">
        <h2 id="incentive-title" className={styles.incentiveTitle}>
          A small thank-you
        </h2>
        <p>Selected participants get a book of their choice:</p>
        <ul className={styles.books}>
          {BOOKS.map((b) => (
            <li key={b.title} className={styles.book}>
              <Image
                className={styles.cover}
                src={b.cover}
                alt=""
                width={48}
                height={72}
              />
              <span className={styles.bookText}>
                <a
                  className={styles.bookTitle}
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {b.title}
                </a>
                <span className={styles.bookAuthor}>{b.author}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>About you</h2>
          <ol className={styles.questions} start={1}>
            <Question
              label="Have you visited the Hard Problems job board before?"
              required
            >
              <Options
                name="visited"
                options={YES_NO}
                value={visited}
                onChange={setVisited}
                disabled={disabled}
              />
            </Question>

            <Question label="What is your current professional role?" required>
              <Options
                name="role"
                options={ROLES}
                value={role}
                onChange={setRole}
                disabled={disabled}
                labels={{ Other: 'Other (please specify)' }}
              />
              {role === 'Other' && (
                <OtherInput
                  label="Your professional role"
                  value={roleOther}
                  onChange={setRoleOther}
                  disabled={disabled}
                />
              )}
            </Question>

            <Question
              label="How many years have you worked in design, product or a related field?"
              required
            >
              <Options
                name="experience"
                options={EXPERIENCE}
                value={experience}
                onChange={setExperience}
                disabled={disabled}
              />
            </Question>

            <Question
              label="Which country are you currently based in?"
              required
            >
              <span className={`${formStyles.field} ${styles.selectField}`}>
                <select
                  aria-label="Country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={disabled}
                  className={formStyles.input}
                >
                  <option value="">Choose a country</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </span>
            </Question>
          </ol>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Your job search</h2>
          <ol className={styles.questions} start={5}>
            <Question label="When did you last look for a job?" required>
              <Options
                name="lastSearch"
                options={LAST_JOB_SEARCH}
                value={lastSearch}
                onChange={setLastSearch}
                disabled={disabled}
              />
            </Question>

            <Question label="Have you acted on an opportunity you found through Hard Problems?">
              <Options
                name="tookAction"
                options={TOOK_ACTION}
                value={tookAction}
                onChange={setTookAction}
                disabled={disabled}
              />
            </Question>
          </ol>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Join our research</h2>
          <ol className={styles.questions} start={7}>
            <Question
              label="Would you be willing to participate in a 60-minute user research interview over video call?"
              required
            >
              <Options
                name="interest"
                options={INTEREST}
                value={interest}
                onChange={setInterest}
                disabled={disabled}
              />
            </Question>

            {interested && (
              <Question
                label="What’s the best email to reach you?"
                hint={
                  booking
                    ? 'We’ll send your calendar invite here.'
                    : 'We’ll email you more about the session.'
                }
                required
              >
                <span className={formStyles.field}>
                  <input
                    type="email"
                    aria-label="Your email address"
                    placeholder="Your email address"
                    autoComplete="email"
                    value={email}
                    maxLength={254}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={disabled}
                    className={formStyles.input}
                  />
                </span>
              </Question>
            )}
          </ol>
          {interested && !booking && consentBox}
        </div>

        {booking && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Choose a time</h2>
            <ol className={styles.questions} start={9}>
              <Question
                label="Pick a time for a 60-minute session."
                hint="Any weekday in November."
                required
              >
                {hasDates ? (
                  <TimePicker
                    dates={dates}
                    timeZones={timeZones}
                    date={date}
                    time={time}
                    timeZone={timeZone}
                    onDate={setDate}
                    onTime={setTime}
                    onTimeZone={setTimeZone}
                    disabled={disabled}
                  />
                ) : (
                  <p className={styles.hint}>
                    There are no session dates open right now — we&rsquo;ll
                    email you when new ones are available.
                  </p>
                )}
              </Question>
            </ol>

            {consentBox}
          </div>
        )}

        <label className={formStyles.honeypot} aria-hidden="true">
          Company
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>

        <p className={styles.privacyNote}>
          We&rsquo;ll only use your details for this research. See our{' '}
          <Link href="/privacy#research">Privacy notice</Link>.
        </p>

        <button
          type="submit"
          className={`${formStyles.formSubmit} ${styles.submit}`}
          disabled={disabled}
          aria-busy={disabled}
        >
          {disabled ? (
            <>
              <Loader2
                className={formStyles.submitIconSpin}
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
              <span>Submitting…</span>
            </>
          ) : (
            <span>Submit</span>
          )}
        </button>
        {error && (
          <p className={formStyles.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
