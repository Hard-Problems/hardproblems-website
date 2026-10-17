'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent
} from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Mail,
  X,
  Check,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

type Status = 'idle' | 'loading' | 'success' | 'error';

type Props = {
  // Trailing text that appears after "Join our newsletter" in the
  // label. Defaults to a colon for the compact header pill; the footer
  // passes a longer descriptive sentence.
  labelSuffix?: string;
  // Drops the "Join our newsletter…" line, for places where the
  // surrounding copy already says it. The input keeps its own
  // aria-label, so nothing is lost for screen readers.
  hideLabel?: boolean;
};

export default function NewsletterForm({
  labelSuffix = ':',
  hideLabel = false
}: Props = {}) {
  const [email, setEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => setMounted(true), []);

  const modalOpen =
    message !== null && (status === 'success' || status === 'error');

  function dismissModal() {
    setMessage(null);
    setStatus('idle');
  }

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') dismissModal();
    }
    window.addEventListener('keydown', onKey);
    closeButtonRef.current?.focus();
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === 'loading') return;
    setStatus('loading');
    setMessage(null);

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, hp: honeypot })
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (res.ok && data.ok) {
        setStatus('success');
        setMessage("You are now subscribed.");
        setEmail('');
      } else {
        setStatus('error');
        setMessage(
          data.error ?? "Couldn't subscribe you. Please try again."
        );
      }
    } catch {
      setStatus('error');
      setMessage("Couldn't reach the newsletter service. Please try again.");
    }
  }

  const modal = modalOpen ? (
    <div
      className="newsletter-modal-backdrop"
      onClick={dismissModal}
      role="presentation"
    >
      <div
        className={`newsletter-modal newsletter-modal--${status}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          ref={closeButtonRef}
          className="newsletter-modal-close"
          aria-label="Close"
          onClick={dismissModal}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="newsletter-modal-icon" aria-hidden="true">
          {status === 'success' ? (
            <Check size={72} strokeWidth={2.5} />
          ) : (
            <AlertCircle size={40} strokeWidth={1.75} />
          )}
        </div>
        <h2 id="newsletter-modal-title" className="newsletter-modal-title">
          {status === 'success' ? 'Thank you' : 'Something went wrong'}
        </h2>
        <p className="newsletter-modal-body">{message}</p>
        <button
          type="button"
          className="newsletter-modal-cta"
          onClick={dismissModal}
        >
          {status === 'success' ? 'Done' : 'Try again'}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <form className="newsletter-form" onSubmit={handleSubmit} noValidate>
        {/* Honeypot — hidden from real users, filled in by dumb bots. */}
        <label className="newsletter-form-honeypot" aria-hidden="true">
          Leave this field empty
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </label>

        {!hideLabel && (
          <span className="newsletter-form-label">
            Join our <Link href="/newsletter">newsletter</Link>
            {labelSuffix}
          </span>
        )}
        <div className="newsletter-form-field">
          <Mail
            className="newsletter-form-icon"
            size={18}
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <input
            className="newsletter-form-email"
            type="email"
            name="email"
            required
            placeholder="Your email..."
            aria-label="Your email address"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'loading'}
          />
          <button
            type="submit"
            className="newsletter-form-submit"
            disabled={status === 'loading'}
            aria-label={status === 'loading' ? 'Subscribing' : 'Subscribe'}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? (
              <Loader2
                className="newsletter-form-submit-icon newsletter-form-submit-icon--spin"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
            ) : (
              <ArrowRight
                className="newsletter-form-submit-icon"
                size={16}
                strokeWidth={2}
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </form>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
