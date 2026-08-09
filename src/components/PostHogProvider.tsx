'use client';

import { Suspense, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import posthog from 'posthog-js';
import {
  PostHogProvider as PHJSProvider,
  usePostHog
} from 'posthog-js/react';

// Initialise PostHog once on the client. The module-level flag guards
// against double-init across HMR reloads in dev.
let posthogInitialised = false;

if (typeof window !== 'undefined') {
  const key = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
  // Default to the reverse-proxy path so events go through hardproblems.com
  // (configured via `rewrites` in next.config.ts). Override only if you need
  // to bypass the proxy.
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest';
  if (key && !posthogInitialised) {
    posthog.init(key, {
      api_host: host,
      // Where the PostHog toolbar links back to. Has to be the real PostHog
      // dashboard, not the proxy path. Change to https://us.posthog.com if on
      // US cloud.
      ui_host: 'https://eu.posthog.com',
      // Cookieless mode: PostHog will not set cookies or write to local
      // storage. Sessions are reconstructed in-memory per page load using
      // request characteristics, then discarded.
      cookieless_mode: 'always',
      // Pageviews are captured manually below — Next.js App Router's client
      // navigation doesn't trigger PostHog's default pageview detection.
      capture_pageview: false,
      capture_pageleave: true,
      person_profiles: 'identified_only',
      // Auto-capture uncaught JS errors + unhandled promise rejections
      // as `$exception` events. Shows up in PostHog under Error Tracking.
      // Anonymous — no user identification, matches the cookieless posture.
      capture_exceptions: true,
      // Drop noise before it ships. Several classes of exception
      // clog Error Tracking without ever representing a real bug:
      //   1. "Script error." — a cross-origin exception whose details
      //      the browser strips for security. Almost always from an
      //      extension.
      //   2. "ResizeObserver loop completed with undelivered
      //      notifications." / "ResizeObserver loop limit exceeded" —
      //      Chrome / Safari's warning that an observer callback
      //      triggered layout work; the browser recovers automatically,
      //      Chrome's own DevRel calls it safe to ignore.
      //   3. Any exception whose top stack frame comes from a
      //      `chrome-extension://` / `moz-extension://` /
      //      `safari-web-extension://` URL — that's an extension's
      //      content script throwing, and we can neither reproduce nor
      //      fix it. Catches Zotero Connector, 1Password, Grammarly,
      //      LastPass, and every future extension without needing a
      //      per-name pattern.
      // None are actionable, so we drop them here rather than letting
      // them drown the real signal.
      before_send: (event) => {
        if (!event || event.event !== '$exception') return event;
        const excList = (event.properties as Record<string, unknown> | undefined)
          ?.$exception_list;
        const first = Array.isArray(excList) ? excList[0] : null;
        if (!first || typeof first !== 'object') return event;
        const value = String(
          (first as { value?: unknown }).value ?? ''
        ).trim();
        const frames = (
          first as { stacktrace?: { frames?: unknown[] } }
        ).stacktrace?.frames as
          | { filename?: string }[]
          | undefined;
        const hasRealStack = Array.isArray(frames) && frames.length > 0;
        if (!hasRealStack && /^script error\.?$/i.test(value)) {
          return null;
        }
        if (/^ResizeObserver loop /i.test(value)) {
          return null;
        }
        // Firefox for iOS ships a WebKit-based browser that injects a
        // `__firefox__` global to bridge JS with its native code. Its
        // injected content scripts occasionally race with the page
        // lifecycle (early load, or after navigation) and throw
        // ReferenceError against a global that isn't defined yet or
        // has been torn down. Nothing on the page or in our bundle to
        // fix — same category as the extension noise below.
        if (/Can't find variable: __firefox__|__firefox__ is not defined/i.test(value)) {
          return null;
        }
        // Crypto-wallet browser extensions inject provider globals
        // (window.ethereum for EVM wallets like MetaMask/Coinbase,
        // window.solana for Phantom, plus TronLink, Aptos, StarkNet,
        // Sui, Polkadot). When two wallets are installed, their
        // provider-swap / teardown scripts race and throw against
        // whichever global just got removed. We're a jobs board, not
        // a web3 site, so any error mentioning these is by
        // definition from an injected wallet.
        if (
          /window\.(ethereum|solana|tron|tronWeb|starknet|aptos|sui|polkadot|bitcoin)/i.test(
            value
          )
        ) {
          return null;
        }
        // Aborted fetches — fire every time a user navigates away
        // during an in-flight request. React re-renders trigger this
        // when cleanup cancels a pending fetch. Zero user-visible
        // impact; the new page just loads. `AbortError` is the DOM
        // exception; "The operation was aborted" is the WebKit
        // wording. Both cover the same class.
        if (
          /^AbortError\b|The operation was aborted|signal is aborted without reason/i.test(
            value
          )
        ) {
          return null;
        }
        // Network flakiness. `TypeError: Failed to fetch` (Chrome),
        // `Load failed` (Safari), and `NetworkError when attempting
        // to fetch resource.` (Firefox) all mean the same thing —
        // the browser couldn't reach the server, usually because
        // WiFi blipped or the user was navigating. Not an app bug.
        if (
          /^(?:TypeError: )?Failed to fetch$|^Load failed$|^NetworkError when attempting to fetch resource\.?$/i.test(
            value
          )
        ) {
          return null;
        }
        // Chunk load failure — Next.js code-split chunks 404 when a
        // user had the tab open across a deploy. Next.js auto-recovers
        // by reloading the page; nothing for us to fix. Filtering out
        // means we lose visibility into deploy churn, but if the
        // recovery is invisible to users it's not worth surfacing.
        if (/ChunkLoadError|Loading chunk \d+ failed|Loading CSS chunk/i.test(value)) {
          return null;
        }
        // Autoplay-blocked <video> elements on article cards. Article
        // thumbnails use `<video autoPlay muted playsInline>`, which
        // works in most browsers but still gets refused in iOS Low
        // Power Mode, Chrome's data-saver, and by users who set
        // autoplay to "Never". The internal .play() rejects with a
        // NotAllowedError, the poster image shows instead, no UI
        // breakage — pure noise.
        if (
          /NotAllowedError/i.test(value) &&
          /play(?:\(\))? (?:method|request) is not allowed|user (?:agent|denied)/i.test(
            value
          )
        ) {
          return null;
        }
        // React hydration mismatches whose root cause is a browser
        // extension mangling the DOM before React hydrates
        // (Chrome/Safari auto-translate, Google Translate extension,
        // some Grammarly builds). React self-heals by regenerating the
        // affected subtree on the client — no user-visible breakage,
        // just log noise. There's no per-user fix we can ship without
        // breaking legitimate auto-translation, so drop the event.
        // Two matcher branches because prod React throws minified
        // errors that reference the code number ("Minified React
        // error #418") while dev throws the full descriptive text.
        // Covers hydration failure (418), Suspense hydration error
        // (422), root hydration error (423), and text-content
        // mismatch (425).
        if (
          /Hydration failed because|server rendered HTML didn't match the client|Text content does not match server-rendered HTML|There was an error while hydrating/i.test(
            value
          ) ||
          /Minified React error #(418|422|423|425)\b/.test(value)
        ) {
          return null;
        }
        // SEO / JSON-LD reader browser extensions (SEO Meta in 1
        // Click, SEO Quake, JSON-LD viewer, rich-results scrapers)
        // walk the page's `<script type="application/ld+json">` blocks
        // and call `.toLowerCase()` on every node's `@context`. Our
        // /jobs page emits a valid JobPosting array where nested
        // objects (hiringOrganization, jobLocation, baseSalary, …)
        // legitimately have no `@context` — schema.org only requires
        // it at the top level. The walker crashes on the first
        // descent. Not our bug and not something we can fix without
        // bloating the JSON-LD payload with redundant fields. The
        // `["@context"].toLowerCase` pattern is a distinctive
        // fingerprint no legit page code would emit.
        if (/["'`]@context["'`]\]\.toLowerCase/i.test(value)) {
          return null;
        }
        // Windows security-suite extensions (McAfee WebAdvisor,
        // Norton Safe Web, etc.) throw a distinctively-shaped
        // promise rejection when their in-page bridge can't find
        // the expected page-side object. Same "not our code, nothing
        // to fix" category as the extension checks above.
        if (
          /^Object Not Found Matching Id:\d+, MethodName:\S+, ParamCount:\d+/i.test(
            value
          )
        ) {
          return null;
        }
        // Extension check — two passes, because extensions throw in
        // varied shapes:
        //   a) message contains a well-known extension name (works even
        //      when the stack is missing / opaque).
        //   b) ANY stack frame lives at an extension:// URL (catches
        //      errors that bubble through browser bridge code before
        //      the extension frame appears).
        if (
          /^(Zotero Connector|LastPass|1Password|Grammarly|Honey|MetaMask|Bitwarden|Dashlane|Enpass|RoboForm|Keeper|NordPass|iCloud Passwords):/i.test(
            value
          )
        ) {
          return null;
        }
        if (hasRealStack) {
          const anyFromExtension = frames.some((f) =>
            /^(chrome-extension|moz-extension|safari-web-extension|webkit-masked-url):\/\//i.test(
              f?.filename ?? ''
            )
          );
          if (anyFromExtension) return null;
        }
        return event;
      }
    });
    posthogInitialised = true;
  }
}

export default function PostHogProvider({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <PHJSProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </PHJSProvider>
  );
}

// Fires a $pageview event whenever the App Router pathname or search params
// change. Wrapped in Suspense above because useSearchParams() triggers a CSR
// bailout otherwise.
function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const client = usePostHog();

  useEffect(() => {
    if (!client || !pathname) return;
    let url = window.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    client.capture('$pageview', { $current_url: url });
  }, [client, pathname, searchParams]);

  return null;
}
