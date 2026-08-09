'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Link as LinkIcon, Mail, Check, Loader2, X } from 'lucide-react';
import styles from './jobSubmit.module.scss';
import { isValidUrl } from '../../lib/validateUrl';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

// Sits alongside the "Get email alerts" trigger at the top of the
// jobs board. Clicking opens a modal with a URL input; submitting
// pipes the link into Slack (#website) for the team to triage.
// Same modal / portal / focus-trap conventions as JobAlertsForm.
export default function JobSubmitForm() {
  const [url, setUrl] = useState('');
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Closing the modal ALSO resets the form so a second open shows a
  // fresh empty form (not the previous submission's thank-you screen).
  // Users who want to submit multiple jobs can just close + reopen.
  const closeModal = () => {
    setModalOpen(false);
    setStatus('idle');
    setError(null);
    setUrl('');
    setEmail('');
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
    // closeModal is stable across renders (setState setters are stable);
    // safe to omit from deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalOpen]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === 'submitting') return;
    setError(null);
    if (!isValidUrl(url)) {
      setError('Please enter a valid URL for the job listing.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/jobs/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, email, hp: honeypot })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        setStatus('error');
        return;
      }
      setStatus('sent');
      // Clear inputs so a follow-up submission starts empty.
      setUrl('');
      setEmail('');
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
          Thank you for submitting this job. We will review and post it on
          the job board soon if it fits our criteria. Please feel free to
          submit more roles. Thanks.
        </p>
      </div>
    </div>
  );

  const renderForm = (): ReactNode => (
    <>
      <p className={styles.hint}>
        Paste the URL of the job listing (company&rsquo;s page, LinkedIn
        post, etc).
      </p>
      <form className={styles.form} onSubmit={onSubmit} noValidate>
        <label className={styles.field}>
          <span className="sr-only">Job listing URL</span>
          <LinkIcon
            className={styles.fieldIcon}
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            type="url"
            required
            inputMode="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </label>
        <label className={styles.field}>
          <span className="sr-only">Your email</span>
          <Mail
            className={styles.fieldIcon}
            size={16}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
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
              <span>Submit</span>
            </>
          )}
        </button>
      </form>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );

  return (
    <>
      {/* Trigger link — sits inline next to the Get email alerts
          trigger at the top of the jobs list. */}
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setModalOpen(true)}
      >
        <span>Submit a job</span>
      </button>

      {/* Modal — portal into document.body so it escapes any
          transformed / overflow-hidden ancestor. */}
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
              aria-labelledby="submit-modal-title"
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
                    <strong id="submit-modal-title">Submit a job</strong>
                    <p className={styles.headerBody}>
                      Know a role that fits our mission? Send us the URL
                      and we&rsquo;ll review it for the board.
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
