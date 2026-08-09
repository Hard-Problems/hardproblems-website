'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader2, X } from 'lucide-react';
import styles from '../jobs/jobSubmit.module.scss';
import { isValidUrl } from '../../lib/validateUrl';

type Status = 'idle' | 'submitting' | 'sent' | 'error';

// Modal replacement for the "Suggest a podcast guest" Google Form
// previously linked from /podcast. Same modal / portal / focus trap /
// honeypot conventions as the coworking + jobs modals.
export default function PodcastGuestForm() {
  const [suggesterName, setSuggesterName] = useState('');
  const [suggesterEmail, setSuggesterEmail] = useState('');
  const [guestName, setGuestName] = useState('');
  const [guestProfileUrl, setGuestProfileUrl] = useState('');
  const [reason, setReason] = useState('');
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
    setSuggesterName('');
    setSuggesterEmail('');
    setGuestName('');
    setGuestProfileUrl('');
    setReason('');
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
    setError(null);
    if (!isValidUrl(guestProfileUrl)) {
      setError("Please enter a valid URL for the guest, like https://linkedin.com/in/them");
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('/api/podcast/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suggesterName,
          suggesterEmail,
          guestName,
          guestProfileUrl,
          reason,
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
          Thanks for suggesting a guest. We read every suggestion and
          reach out when we&rsquo;re ready to schedule interviews.
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
            value={suggesterName}
            onChange={(e) => setSuggesterName(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>Your email (optional)</span>
        <span className={styles.field}>
          <input
            type="email"
            autoComplete="email"
            value={suggesterEmail}
            onChange={(e) => setSuggesterEmail(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          Podcast guest&rsquo;s name
        </span>
        <span className={styles.field}>
          <input
            type="text"
            required
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          Podcast guest&rsquo;s LinkedIn or website
        </span>
        <span className={styles.field}>
          <input
            type="url"
            required
            inputMode="url"
            value={guestProfileUrl}
            onChange={(e) => setGuestProfileUrl(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
      <label className={styles.labeledField}>
        <span className={styles.fieldLabel}>
          What do you admire about this podcast guest?
        </span>
        <span className={styles.field}>
          <textarea
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={status === 'submitting'}
            className={styles.input}
          />
        </span>
      </label>
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
            <span>Suggest a guest</span>
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
        <span>Suggest a guest</span>
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
              aria-labelledby="podcast-modal-title"
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
                    <strong id="podcast-modal-title">
                      Suggest a guest
                    </strong>
                    <p className={styles.headerBody}>
                      Know someone who should be on the podcast? Tell
                      us about them and why.
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
