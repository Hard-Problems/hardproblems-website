'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, Loader2 } from 'lucide-react';
import formStyles from '../app/jobs/jobSubmit.module.scss';
import styles from './DesignInternApplicationForm.module.scss';
import { isValidUrl } from '../lib/validateUrl';

// Inline job-application form embedded in
// content/articles/design-intern.md via the
// `<div id="design-intern-application-form"></div>` marker that the
// article page splits its rendered HTML on. Not a modal — the form
// renders directly under the "How to apply" section so applicants
// don't have to leave the page to submit.
//
// Client-side validation catches obvious slips (missing required
// fields, malformed emails/URLs) before the network round-trip. The
// server (src/app/api/design-intern/apply/route.ts) re-runs every
// check independently and is the ONLY authority — never trust the
// client.

type Status = 'idle' | 'submitting' | 'sent' | 'error';
type YesNo = '' | 'yes' | 'no';
type Schedule = '' | 'yes' | 'no' | 'other';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function DesignInternApplicationForm() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [location, setLocation] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [writingExampleUrl, setWritingExampleUrl] = useState('');
  const [whyRole, setWhyRole] = useState('');
  const [proudestProject, setProudestProject] = useState('');
  const [dreamJob, setDreamJob] = useState('');
  const [linkedinOrCvUrl, setLinkedinOrCvUrl] = useState('');
  const [rightToWorkUk, setRightToWorkUk] = useState<YesNo>('');
  const [availableSchedule, setAvailableSchedule] = useState<Schedule>('');
  const [availableScheduleOther, setAvailableScheduleOther] = useState('');
  const [availableFullTerm, setAvailableFullTerm] = useState<YesNo>('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  // Ref for the outer wrapper so we can scroll it into view once the
  // form is replaced with the confirmation panel — otherwise the
  // viewport stays parked where the long form's Submit button was,
  // and the short "Application received" panel scrolls off-screen
  // above the fold.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const sentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (status !== 'sent') return;
    // Small delay so React commits the sent panel before we
    // measure — otherwise scrollIntoView jumps to the still-tall
    // form's top rather than the just-swapped-in short panel.
    const id = window.requestAnimationFrame(() => {
      wrapRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
      // Also move focus so screen readers announce the confirmation
      // heading — the panel wrapper has tabIndex={-1} for this.
      sentRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(id);
  }, [status]);

  const disabled = status === 'submitting';

  function fail(msg: string) {
    setError(msg);
    setStatus('error');
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setError(null);

    // Client-side validation in the same field order the form
    // renders — user sees "the first broken thing" so they can fix
    // top-to-bottom.
    if (!fullName.trim()) return fail('Please enter your name.');
    if (!EMAIL_RE.test(email.trim())) {
      return fail('Please enter a valid email address.');
    }
    if (!location.trim()) return fail('Please enter your location.');
    if (!isValidUrl(portfolioUrl)) {
      return fail('Please enter a valid portfolio URL.');
    }
    if (writingExampleUrl.trim() && !isValidUrl(writingExampleUrl)) {
      return fail(
        'Please enter a valid URL for your writing example, or leave it blank.'
      );
    }
    if (!whyRole.trim()) {
      return fail('Please tell us why you want the role.');
    }
    if (!proudestProject.trim()) {
      return fail("Please share a project you're most proud of.");
    }
    if (!dreamJob.trim()) {
      return fail('Please describe your dream role.');
    }
    if (!isValidUrl(linkedinOrCvUrl)) {
      return fail('Please enter a valid LinkedIn or CV URL.');
    }
    if (!rightToWorkUk) {
      return fail(
        'Please confirm whether you have the right to work in the UK.'
      );
    }
    if (!availableSchedule) {
      return fail(
        'Please tell us whether you are available for a few hours, 5 days per week.'
      );
    }
    if (availableSchedule === 'other' && !availableScheduleOther.trim()) {
      return fail('Please tell us about your availability.');
    }
    if (!availableFullTerm) {
      return fail(
        'Please confirm whether you are available for the full 9-month term.'
      );
    }

    setStatus('submitting');
    try {
      const res = await fetch('/api/design-intern/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          location,
          portfolioUrl,
          writingExampleUrl,
          linkedinOrCvUrl,
          whyRole,
          proudestProject,
          dreamJob,
          rightToWorkUk,
          availableSchedule,
          availableScheduleOther:
            availableSchedule === 'other' ? availableScheduleOther : '',
          availableFullTerm,
          hp: honeypot
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('sent');
    } catch {
      setError("We couldn't reach the server. Please try again.");
      setStatus('error');
    }
  };

  const renderSent = (): ReactNode => (
    <div
      className={formStyles.sent}
      ref={sentRef}
      tabIndex={-1}
      role="status"
      aria-live="polite"
    >
      <Check
        size={20}
        className={formStyles.sentIcon}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <div>
        <strong>Application received</strong>
        <p className={formStyles.sentBody}>
          Thank you for applying for the design intern role. We
          review applications as they come in and will be in touch
          by email.
        </p>
      </div>
    </div>
  );

  if (status === 'sent') {
    return (
      <div ref={wrapRef} className={styles.wrap}>
        {renderSent()}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={styles.wrap}>
      <h3 className={styles.formTitle}>Apply to be our design intern</h3>
      <form className={formStyles.form} onSubmit={onSubmit} noValidate>
        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            Your name
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <input
              type="text"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            Email
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            Location
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
          <span className={styles.fieldHint}>City, country</span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            Portfolio URL
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <input
              type="url"
              required
              inputMode="url"
              placeholder="https://"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
          <span className={styles.fieldHint}>
            If your portfolio is a file, please upload to the cloud
            and share a link.
          </span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            Link to an example of your writing that you&rsquo;re proud
            of
            <span className={styles.optionalHint}>
              (optional but preferred)
            </span>
          </span>
          <span className={formStyles.field}>
            <input
              type="url"
              inputMode="url"
              placeholder="https://"
              value={writingExampleUrl}
              onChange={(e) => setWritingExampleUrl(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            Why do you want the role?
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <textarea
              required
              rows={5}
              value={whyRole}
              onChange={(e) => setWhyRole(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            What project that you worked on are you most proud of?
            Please explain why.
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <textarea
              required
              rows={5}
              value={proudestProject}
              onChange={(e) => setProudestProject(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            What kind of role is your dream job in the future? Please
            explain.
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <textarea
              required
              rows={5}
              value={dreamJob}
              onChange={(e) => setDreamJob(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
        </label>

        <label className={formStyles.labeledField}>
          <span className={formStyles.fieldLabel}>
            LinkedIn or your CV URL
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </span>
          <span className={formStyles.field}>
            <input
              type="url"
              required
              inputMode="url"
              placeholder="https://"
              value={linkedinOrCvUrl}
              onChange={(e) => setLinkedinOrCvUrl(e.target.value)}
              disabled={disabled}
              className={formStyles.input}
            />
          </span>
          <span className={styles.fieldHint}>
            If your CV is a file, please upload to the cloud and
            share a link.
          </span>
        </label>

        <fieldset
          className={formStyles.labeledField}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className={formStyles.fieldLabel}>
            Do you have the right to work in the UK?
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </legend>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="rightToWorkUk"
                value="yes"
                checked={rightToWorkUk === 'yes'}
                onChange={() => setRightToWorkUk('yes')}
                disabled={disabled}
                required
              />
              Yes
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="rightToWorkUk"
                value="no"
                checked={rightToWorkUk === 'no'}
                onChange={() => setRightToWorkUk('no')}
                disabled={disabled}
              />
              No
            </label>
          </div>
        </fieldset>

        <fieldset
          className={formStyles.labeledField}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className={formStyles.fieldLabel}>
            Are you available for a few hours, 5 days per week?
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </legend>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="availableSchedule"
                value="yes"
                checked={availableSchedule === 'yes'}
                onChange={() => setAvailableSchedule('yes')}
                disabled={disabled}
                required
              />
              Yes
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="availableSchedule"
                value="no"
                checked={availableSchedule === 'no'}
                onChange={() => setAvailableSchedule('no')}
                disabled={disabled}
              />
              No
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="availableSchedule"
                value="other"
                checked={availableSchedule === 'other'}
                onChange={() => setAvailableSchedule('other')}
                disabled={disabled}
              />
              Other
            </label>
          </div>
          {availableSchedule === 'other' && (
            <span
              className={formStyles.field}
              style={{ marginTop: '0.5rem' }}
            >
              <input
                type="text"
                required
                placeholder="Tell us about your availability"
                value={availableScheduleOther}
                onChange={(e) =>
                  setAvailableScheduleOther(e.target.value)
                }
                disabled={disabled}
                className={formStyles.input}
                aria-label="Describe your availability"
              />
            </span>
          )}
        </fieldset>

        <fieldset
          className={formStyles.labeledField}
          style={{ border: 0, padding: 0, margin: 0 }}
        >
          <legend className={formStyles.fieldLabel}>
            Available for the full 9 months from Sept 2026 to June 2027?
            <span className={styles.requiredMark} aria-label="required">
              *
            </span>
          </legend>
          <div className={styles.radioGroup}>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="availableFullTerm"
                value="yes"
                checked={availableFullTerm === 'yes'}
                onChange={() => setAvailableFullTerm('yes')}
                disabled={disabled}
                required
              />
              Yes
            </label>
            <label className={styles.radioOption}>
              <input
                type="radio"
                name="availableFullTerm"
                value="no"
                checked={availableFullTerm === 'no'}
                onChange={() => setAvailableFullTerm('no')}
                disabled={disabled}
              />
              No
            </label>
          </div>
        </fieldset>

        {/* Honeypot — hidden from real users, tempting to bots. */}
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
          className={`${formStyles.formSubmit} ${styles.submitButton}`}
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
            <>
              <Check size={16} strokeWidth={2.5} aria-hidden="true" />
              <span>Submit application</span>
            </>
          )}
        </button>

        {error && <p className={formStyles.error}>{error}</p>}
      </form>
    </div>
  );
}
