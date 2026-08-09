'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, X } from 'lucide-react';
import styles from '../jobs/jobSubmit.module.scss';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

// Values must match DESK_TYPES in the API route — the server rejects
// anything else. Order here is the order the dropdown renders.
const DESK_TYPES = [
  'Free long-term desk',
  'Drop-in desk for 1-5 days',
  'Drop-in desk for more than 5 days'
] as const;

// Modal replacement for the "Apply for a desk" Google Form previously
// linked from /coworking. Mirrors JobSubmitForm's modal, portal, focus
// trap and honeypot conventions so the whole site's form UX stays
// consistent.
export default function DeskApplicationForm() {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [profileUrl, setProfileUrl] = useState('');
  const [deskType, setDeskType] = useState<string>('');
  const [hardProblem, setHardProblem] = useState('');
  const [organization, setOrganization] = useState('');
  const [note, setNote] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  const closeModal = () => {
    setModalOpen(false);
    setStatus('idle');
    setError(null);
    // Reset fields on close so a re-open shows a fresh form, matching
    // JobSubmitForm's behaviour.
    setEmail('');
    setFullName('');
    setProfileUrl('');
    setDeskType('');
    setHardProblem('');
    setOrganization('');
    setNote('');
  };

  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeModal();
    }
    document.addEventListener('keydown', handleKey);
    closeButtonRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setStatus('submitting');
    setError(null);
    try {
      const res = await fetch('/api/coworking/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          fullName,
          profileUrl,
          deskType,
          hardProblem,
          organization,
          note,
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
    <div className={styles.sent}>
      <Check
        size={20}
        className={styles.sentIcon}
        strokeWidth={2.5}
        aria-hidden="true"
      />
      <div>
        <strong>Thank you</strong>
        <p className={styles.sentBody}>
          Thanks for applying for a desk at Hard Problems. We&rsquo;ll
          review and be in touch by email as soon as we can.
        </p>
      </div>
    </div>
  );

  const renderForm = (): ReactNode => (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>Your name</span>
        <span className={styles.field}>
          <input
            type="text"
            required
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>Your email</span>
        <span className={styles.field}>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          LinkedIn or website URL
        </span>
        <span className={styles.field}>
          <input
            type="url"
            required
            inputMode="url"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          Type of desk you are applying for
        </span>
        <span className={styles.field}>
          <select
            required
            value={deskType}
            onChange={(e) => setDeskType(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          >
            <option value="" disabled>
              Choose one…
            </option>
            {DESK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          What &lsquo;hard problem&rsquo; do you work on?
        </span>
        <span className={styles.field}>
          <textarea
            required
            rows={4}
            value={hardProblem}
            onChange={(e) => setHardProblem(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          What organization are you working with? (optional)
        </span>
        <span className={styles.field}>
          <input
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          When do you need a desk? For how long? Any details you want
          to add… (optional)
        </span>
        <span className={styles.field}>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      {/* Honeypot — hidden from real users, tempting to bots. */}
      <label className={styles.honeypot} aria-hidden="true">
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
        className={styles.formSubmit}
        disabled={status === 'submitting'}
        aria-busy={status === 'submitting'}
      >
        {status === 'submitting' ? (
          <>
            <Loader2
              className={styles.submitIconSpin}
              size={16}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span>Submitting…</span>
          </>
        ) : (
          <>
            <Check size={16} strokeWidth={2.5} aria-hidden="true" />
            <span>Apply for a desk</span>
          </>
        )}
      </button>
      {error && <p className={styles.error}>{error}</p>}
    </form>
  );

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setModalOpen(true)}
      >
        <span>Apply for a desk</span>
      </button>

      {mounted &&
        modalOpen &&
        createPortal(
          <div
            className={styles.modalBackdrop}
            role="presentation"
            onClick={closeModal}
          >
            <div
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="desk-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                ref={closeButtonRef}
                type="button"
                className={styles.modalClose}
                aria-label="Close"
                onClick={closeModal}
              >
                <X size={18} aria-hidden="true" />
              </button>
              {status !== 'sent' && (
                <div className={styles.header}>
                  <div>
                    <strong id="desk-modal-title">Apply for a desk</strong>
                    <p className={styles.headerBody}>
                      Tell us a bit about you and the hard problem you
                      work on. We&rsquo;ll review and get back to you by
                      email.
                    </p>
                  </div>
                </div>
              )}
              {status === 'sent' ? renderSent() : renderForm()}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
