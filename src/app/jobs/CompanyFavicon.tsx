'use client';

import { useEffect, useRef, useState } from 'react';

// Client-side favicon <img> with a Globe-icon fallback. The /api/favicon
// proxy 404s Google's fuzzy-globe stand-in for missing favicons, so
// when we see an error here it means either the real favicon didn't
// exist or the proxy couldn't reach Google — either way, show the
// generic globe glyph instead of the browser's broken-image icon.
//
// The <img> is server-rendered, so the browser may 404 the favicon
// before React attaches the onError listener during hydration. In
// that case the error event is lost, and without the useEffect check
// below the broken image would sit visible forever. After mount we
// re-inspect `complete` + `naturalWidth`; a completed image with zero
// natural width failed to load, so we flip to the fallback.

export default function CompanyFavicon({
  src,
  alt,
  className,
  fallback,
  // Rendered size in CSS px. The job lists use the 16px default; the
  // per-job pages pass 20 for the icon beside the organisation name.
  // The proxy's source is 64px either way, so both stay sharp on a
  // high-DPI display.
  size = 16
}: {
  src: string;
  alt: string;
  className?: string;
  // Rendered in place of the image when it fails to load. The job lists
  // pass a globe glyph; the per-job pages pass null, so a company with
  // no favicon simply shows none and the name closes the gap.
  fallback: React.ReactNode;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  if (failed) return <>{fallback}</>;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
