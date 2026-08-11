'use client';

// Route-level error boundary for /jobs. Next.js App Router auto-wraps
// the route in a React error boundary that renders this component
// whenever a client component below (JobsList, JobsTeaser, etc.)
// throws mid-render. Without this file the user sees a blank white
// page — with it, they get a message and a retry button.
//
// The `error` prop is the thrown Error; `reset` re-mounts the route,
// which usually clears whatever transient state triggered the crash.

import { useEffect } from 'react';
import posthog from 'posthog-js';

export default function JobsError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Log to the browser console so it also shows up in PostHog's
  // exception capture (which listens on window.onerror). The `digest`
  // is a hashed identifier Next.js generates in prod so a user's
  // support message can be matched back to the server log entry.
  //
  // Also ping PostHog with the URL + a compact snapshot of `error`
  // fields as its own event. Route-level React errors reach here
  // without the URL context PostHog's autocapture keeps at the
  // `$exception` level, so we tag one manually to make future triage
  // of the same crash actionable (which page path? which query? was
  // it a stack overflow, a syntax error, or something else?).
  useEffect(() => {
    console.error('[JobsError]', error);
    try {
      const url = typeof window !== 'undefined' ? window.location.href : '';
      const query =
        typeof window !== 'undefined' ? window.location.search : '';
      posthog?.capture?.('jobs_route_error', {
        error_name: error?.name ?? 'Error',
        error_message: error?.message ?? String(error ?? ''),
        error_stack_head: error?.stack?.split('\n').slice(0, 8).join('\n'),
        digest: error?.digest ?? null,
        page_url: url,
        page_query: query,
        user_agent:
          typeof navigator !== 'undefined' ? navigator.userAgent : ''
      });
    } catch {
      // Never let the error handler itself throw.
    }
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 640,
        margin: '4rem auto',
        padding: '2rem',
        textAlign: 'center'
      }}
    >
      <h1>Something went wrong loading the job board</h1>
      <p style={{ margin: '1rem 0' }}>
        Please try again — a refresh usually fixes it. If it keeps
        happening, let us know at{' '}
        <a href="mailto:hello@hardproblems.com">hello@hardproblems.com</a>.
      </p>
      <button
        type="button"
        onClick={reset}
        style={{
          padding: '0.6rem 1.4rem',
          borderRadius: 999,
          border: 0,
          background: '#235337',
          color: '#fff',
          fontWeight: 500,
          cursor: 'pointer'
        }}
      >
        Try again
      </button>
      {error.digest && (
        <p
          style={{
            marginTop: '1.5rem',
            fontSize: '0.75rem',
            color: '#777'
          }}
        >
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
