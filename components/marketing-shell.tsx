"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { exploreLinks, mainNavLinks } from "@/lib/topic-nav";

type MarketingShellProps = {
  children: React.ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <div className="site-shell">
      <div className="ambient-bg" aria-hidden>
        <span className="ambient-orb orb-a" />
        <span className="ambient-orb orb-b" />
        <span className="ambient-orb orb-c" />
      </div>

      <header className="public-nav">
        <div className="container nav-inner">
          <Link className="nav-brand" href="/">
            <span className="brand-dot" />
            SciSphere
          </Link>

          <nav className="nav-links">
            {mainNavLinks.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : ""}>
                {link.label}
              </Link>
            ))}
          </nav>

          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? "Close" : "Menu"}
          </button>

          <div className="auth-links">
            <Link className="button secondary" href="/sign-in">
              Sign in
            </Link>
            <Link className="button" href="/sign-up">
              Join free
            </Link>
          </div>
        </div>

        {menuOpen ? (
          <div className="container mobile-menu stack">
            <div className="menu-group-label">Main navigation</div>
            {mainNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(link.href) ? "mobile-link active" : "mobile-link"}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="menu-group-label">Explore</div>
            {exploreLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(link.href) ? "mobile-link active" : "mobile-link"}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <div className="menu-group-label">App</div>
            <div className="row wrap">
              <Link className="button secondary" href="/feed" onClick={() => setMenuOpen(false)}>
                Open app
              </Link>
              <Link className="button secondary" href="/search" onClick={() => setMenuOpen(false)}>
                Search app
              </Link>
            </div>
            <div className="row">
              <Link className="button secondary" href="/sign-in" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
              <Link className="button" href="/sign-up" onClick={() => setMenuOpen(false)}>
                Join free
              </Link>
            </div>
          </div>
        ) : null}
      </header>

      {children}

      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="stack">
            <Link className="nav-brand" href="/">
              <span className="brand-dot" />
              Science Platform
            </Link>
            <p className="muted">Built for students, researchers, educators, and science enthusiasts who want high-signal collaboration.</p>
          </div>

          <div className="stack">
            <strong>Platform</strong>
            <Link href="/platform">Overview</Link>
            <Link href="/features">Features</Link>
            <Link href="/science-communities">Communities</Link>
            <Link href="/study-groups">Study groups</Link>
            <Link href="/plans">Plans</Link>
          </div>

          <div className="stack">
            <strong>Resources</strong>
            <Link href="/integrations">Integrations</Link>
            <Link href="/security">Security</Link>
            <Link href="/changelog">Changelog</Link>
            <Link href="/help">Help center</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/for-educators">For educators</Link>
            <Link href="/events-public">Events</Link>
          </div>

          <div className="stack">
            <strong>App</strong>
            <Link href="/feed">Feed</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/pricing">In-app pricing</Link>
            <Link href="/careers">Careers</Link>
            <Link href="/demo/presentation">Demo presentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export function SectionHeader({ badge, title, copy }: { badge?: string; title: string; copy: string }) {
  return (
    <div className="stack" style={{ gap: "0.5rem" }}>
      {badge ? <span className="badge">{badge}</span> : null}
      <h2 className="section-title">{title}</h2>
      <p className="section-copy">{copy}</p>
    </div>
  );
}
