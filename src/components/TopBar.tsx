'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

// Each link carries two labels — a short one shown on mobile and a
// longer one shown on desktop. The full-width label switches over at
// the same breakpoint the rest of the site uses (1000px).
type NavItem = {
  href: string;
  short: string;
  long: string;
  matches?: (pathname: string) => boolean;
  // Gives up its place in the bar on the narrowest phones, where the
  // five controls stop fitting. See `.site-nav-collapsible`.
  collapsible?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/', short: 'Home', long: 'Home' },
  { href: '/jobs', short: 'Jobs', long: 'Job board' },
  { href: '/podcast', short: 'Podcast', long: 'Podcast' },
  { href: '/about', short: 'About', long: 'About us', collapsible: true }
];

// The pages this bar had no room for. Until now they were reachable on
// a phone only from the footer: the desktop header carries Coworking
// and Newsletter in its right-hand rail, and /give is in neither nav.
//
// About is here as well as in the bar above. Only one of the two is
// ever displayed — CSS decides which, at a width where the bar can no
// longer hold it — so this is a second place to render the same link,
// not a second link.
const MORE_ITEMS: {
  href: string;
  label: string;
  collapsedOnly?: boolean;
}[] = [
  { href: '/about', label: 'About us', collapsedOnly: true },
  { href: '/coworking', label: 'Coworking' },
  { href: '/newsletter', label: 'Newsletter' },
  { href: '/give', label: 'Support our work' }
];

export default function TopBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const more = useRef<HTMLDivElement>(null);

  // Close on navigation. The bar persists across route changes, so
  // without this the menu would still be hanging open on the page it
  // just sent you to.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Escape, and a tap anywhere else. `pointerdown` rather than `click`
  // so the menu is already gone by the time a tap lands on whatever is
  // underneath it, and capture so it still fires if something in the
  // page stops the event on its way up.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!more.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [open]);

  return (
    <nav className="site-nav-bar">
      {/* The scrolling half. Overflow lives here rather than on the
          <nav> so the menu below can hang outside the bar instead of
          being clipped by it. */}
      <div className="site-nav-scroll">
        {NAV_ITEMS.map((item) => {
          const isActive = item.matches
            ? item.matches(pathname)
            : pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'link',
                isActive ? 'active' : '',
                item.collapsible ? 'site-nav-collapsible' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <span className="nav-label-short">{item.short}</span>
              <span className="nav-label-long">{item.long}</span>
            </Link>
          );
        })}
      </div>

      <div className="site-nav-more" ref={more}>
        <button
          type="button"
          // `link` so it takes the same type and padding as the real
          // links beside it and sits in the same run. It never takes
          // their active underline, though: that marks the page you
          // are on, and this is a control rather than a page.
          className="link site-nav-more-button"
          aria-expanded={open}
          aria-controls="site-nav-more-menu"
          onClick={() => setOpen((wasOpen) => !wasOpen)}
        >
          More
          <ChevronDown className="site-nav-more-chevron" aria-hidden="true" />
        </button>

        {/* `hidden` rather than rendering nothing: the links stay in the
            HTML whether or not the menu has been opened, so they are
            still there to be crawled and found. */}
        <div
          id="site-nav-more-menu"
          className="site-nav-more-menu"
          hidden={!open}
        >
          {MORE_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                'link',
                pathname === item.href ? 'active' : '',
                item.collapsedOnly ? 'site-nav-collapsed-only' : ''
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
