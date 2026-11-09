'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import formStyles from '../../jobs/jobSubmit.module.scss';
import styles from './page.module.scss';
import {
  ACTIONS,
  EXPERIENCE,
  INTEREST,
  LAST_JOB_SEARCH,
  ROLES,
  TIMES,
  TOOK_ACTION,
  YES_NO,
  isInterested
} from '../../../lib/research/screening';

// The participant screening form. Client-side checks catch obvious
// slips; /api/research/screening re-checks everything and is the only
// authority.

type Status = 'idle' | 'submitting' | 'sent' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function toggle(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function Required() {
  return (
    <span className={styles.requiredMark} aria-label="required">
      *
    </span>
  );
}

function Question({
  number,
  label,
  hint,
  required,
  children
}: {
  number?: number;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.question}>
      <legend className={styles.legend}>
        {number !== undefined && (
          <span className={styles.number}>{number}.</span>
        )}
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

function Checkboxes({
  options,
  value,
  onChange,
  disabled,
  labels
}: {
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  disabled: boolean;
  labels?: Record<string, string>;
}) {
  return (
    <div className={styles.options}>
      {options.map((o) => (
        <label key={o} className={styles.option}>
          <input
            type="checkbox"
            value={o}
            checked={value.includes(o)}
            onChange={() => onChange(toggle(value, o))}
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

export default function ScreeningForm({
  countries,
  days
}: {
  countries: string[];
  days: string[];
}) {
  const [visited, setVisited] = useState('');
  const [role, setRole] = useState('');
  const [roleOther, setRoleOther] = useState('');
  const [experience, setExperience] = useState('');
  const [country, setCountry] = useState('');
  const [lastSearch, setLastSearch] = useState('');
  const [tookAction, setTookAction] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  const [actionOther, setActionOther] = useState('');
  const [interest, setInterest] = useState('');
  const [email, setEmail] = useState('');
  const [comments, setComments] = useState('');
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
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
      // Leave it blank — they can type it.
    }
  }, []);

  useEffect(() => {
    if (status !== 'sent') return;
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [status]);

  const disabled = status === 'submitting';
  const interested = isInterested(interest);

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
    if (!tookAction)
      return fail(
        'Please tell us whether you’ve acted on an opportunity from Hard Problems.'
      );
    if (tookAction === 'Yes' && actions.length === 0)
      return fail('Please tell us what you did with the opportunity.');
    if (tookAction === 'Yes' && actions.includes('Other') && !actionOther.trim())
      return fail('Please specify what else you did.');
    if (!interest)
      return fail('Please tell us whether you’d like to join a research session.');
    if (interested) {
      if (!EMAIL_RE.test(email.trim()))
        return fail('Please enter a valid email address so we can get in touch.');
      if (availableDays.length === 0)
        return fail('Please choose at least one day that works for you.');
      if (availableTimes.length === 0)
        return fail('Please choose at least one time that works for you.');
      if (!timeZone.trim()) return fail('Please tell us your local time zone.');
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
          actions: tookAction === 'Yes' ? actions : [],
          actionOther,
          interest,
          email: interested ? email : '',
          comments,
          availableDays: interested ? availableDays : [],
          availableTimes: interested ? availableTimes : [],
          timeZone: interested ? timeZone : '',
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

  if (status === 'sent') {
    return (
      <div ref={topRef} className={styles.wrap}>
        <div className={styles.thanks} role="status">
          <Check
            size={28}
            className={formStyles.sentIcon}
            strokeWidth={2.5}
            aria-hidden="true"
          />
          <h1 className={styles.thanksTitle}>Thank you!</h1>
          <p>Thank you for taking the time to complete this questionnaire!</p>
          <p>
            If you&rsquo;ve expressed interest in participating in our
            research, we&rsquo;ll be in touch with more details about the
            session.
          </p>
          <p>
            As a small thank-you, selected research participants will receive
            a free book for their time and contribution.
          </p>
          <p>We appreciate your help!</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={topRef} className={styles.wrap}>
      <h1 className="page-title">
        Participant screening &amp; research interest form
      </h1>
      <div className={styles.intro}>
        <p>
          We&rsquo;re looking to better understand how people discover,
          explore and evaluate career opportunities, and how we can make the
          Hard Problems job board more useful.
        </p>
        <p>
          This short questionnaire will help us understand your experience and
          identify people who might be interested in participating in a
          follow-up user research session.
        </p>
        <p>
          The questionnaire should take approximately 2–3 minutes. Your
          responses will be used for internal research and participant
          recruitment purposes.
        </p>
        <p>Thank you for helping us make Hard Problems better!</p>
      </div>

      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Section 1: About you</h2>

          <Question
            number={1}
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

          <Question
            number={2}
            label="What is your current professional role?"
            required
          >
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
            number={3}
            label="How many years of professional experience do you have in design, product management or a related field?"
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
            number={4}
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
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Section 2: Your job-search experience
          </h2>

          <Question
            number={5}
            label="When was the last time you actively looked for a job?"
            required
          >
            <Options
              name="lastSearch"
              options={LAST_JOB_SEARCH}
              value={lastSearch}
              onChange={setLastSearch}
              disabled={disabled}
            />
          </Question>

          <Question
            number={6}
            label="Have you ever taken any action on an opportunity you found through Hard Problems?"
            required
          >
            <Options
              name="tookAction"
              options={TOOK_ACTION}
              value={tookAction}
              onChange={setTookAction}
              disabled={disabled}
            />
          </Question>

          {tookAction === 'Yes' && (
            <Question
              label="What did you do?"
              hint="Select all that apply."
              required
            >
              <Checkboxes
                options={ACTIONS}
                value={actions}
                onChange={setActions}
                disabled={disabled}
                labels={{ Other: 'Other (please specify)' }}
              />
              {actions.includes('Other') && (
                <OtherInput
                  label="What else you did"
                  value={actionOther}
                  onChange={setActionOther}
                  disabled={disabled}
                />
              )}
            </Question>
          )}
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>
            Section 3: Participate in our research
          </h2>

          <Question
            number={7}
            label="Would you be interested in being contacted for a follow-up user research session about your experience with job searching and the Hard Problems job board?"
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
              number={8}
              label="Please leave your preferred email address so we can get in touch."
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

          <Question
            number={9}
            label="Is there anything else you’d like to share about your job-search experience or what you look for in a job platform?"
          >
            <span className={formStyles.field}>
              <textarea
                aria-label="Your response"
                placeholder="Your response"
                rows={4}
                value={comments}
                maxLength={4000}
                onChange={(e) => setComments(e.target.value)}
                disabled={disabled}
                className={formStyles.input}
              />
            </span>
          </Question>
        </div>

        {interested && (
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Choose a time</h2>

            <Question
              number={10}
              label="What days and times would generally work best for you for a 60-minute research session?"
              required
            >
              <p className={styles.subLabel}>Days</p>
              <Checkboxes
                options={days}
                value={availableDays}
                onChange={setAvailableDays}
                disabled={disabled}
              />
              <p className={styles.subLabel}>Time</p>
              <Checkboxes
                options={TIMES}
                value={availableTimes}
                onChange={setAvailableTimes}
                disabled={disabled}
              />
              <label className={styles.timeZone}>
                <span className={styles.subLabel}>Your local time zone</span>
                <span className={formStyles.field}>
                  <input
                    type="text"
                    placeholder="e.g. Europe/London"
                    value={timeZone}
                    maxLength={100}
                    onChange={(e) => setTimeZone(e.target.value)}
                    disabled={disabled}
                    className={formStyles.input}
                  />
                </span>
              </label>
            </Question>

            <label className={`${styles.option} ${styles.consent}`}>
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                disabled={disabled}
              />
              <span>
                I agree to be contacted by the Hard Problems team about
                participating in future user research. I understand that
                providing my contact details does not guarantee selection.
                <Required />
              </span>
            </label>
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
