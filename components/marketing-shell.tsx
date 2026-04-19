"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const marketingLinks = [
  { href: "/", label: "Home" },
  { href: "/platform", label: "Platform" },
  { href: "/about", label: "About" },
  { href: "/features", label: "Features" },
  { href: "/integrations", label: "Integrations" },
  { href: "/science-communities", label: "Communities" },
  { href: "/study-groups", label: "Study Groups" },
  { href: "/for-educators", label: "For Educators" },
  { href: "/events-public", label: "Events" },
  { href: "/plans", label: "Plans" },
  { href: "/help", label: "Help" },
  { href: "/contact", label: "Contact" }
];

type MarketingShellProps = {
  children: React.ReactNode;
};

export function MarketingShell({ children }: MarketingShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname?.startsWith(href));

  return (
    <div className="site-shell">
      <header className="public-nav">
        <div className="container nav-inner">
          <Link className="nav-brand" href="/">
            <span className="brand-dot" />
            SciSphere
          </Link>

          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? "Close" : "Menu"}
          </button>

          <nav className="nav-links">
            {marketingLinks.map((link) => (
              <Link key={link.href} href={link.href} className={isActive(link.href) ? "active" : ""}>
                {link.label}
              </Link>
            ))}
          </nav>

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
            {marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={isActive(link.href) ? "mobile-link active" : "mobile-link"}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
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
