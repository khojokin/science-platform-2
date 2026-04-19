import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";

const features = [
  "Science communities by subject",
  "Profiles built for learners and researchers",
  "Posts, comments, follows, and study groups",
  "Direct messages and collaboration",
  "Premium subscriptions for advanced tools"
];

export default function LandingPage() {
  return (
    <main className="container" style={{ paddingBlock: "2rem 4rem" }}>
      <div className="hero-grid">
        <section className="stack">
          <span className="badge">Science-first social platform</span>
          <h1 className="hero-title">Connect, study, and build in public with the science community.</h1>
          <p className="page-copy">
            This MVP is focused on STEM learners, educators, and early researchers who need one place for
            communities, peer networking, study groups, and paid premium tools.
          </p>
          <div className="actions">
            <SignedOut>
              <Link className="button" href="/sign-up">
                Get started
              </Link>
              <Link className="button secondary" href="/sign-in">
                Sign in
              </Link>
              <Link className="button secondary" href="/demo">
                View demo
              </Link>
              <Link className="button secondary" href="/demo/presentation?audience=investors">
                Presentation mode
              </Link>
            </SignedOut>
            <SignedIn>
              <Link className="button" href="/feed">
                Open platform
              </Link>
              <Link className="button secondary" href="/demo">Demo</Link>
              <UserButton />
            </SignedIn>
          </div>
        </section>

        <aside className="hero-panel stack">
          <div className="grid three">
            <div className="metric">
              <div className="kpi">9</div>
              <div className="muted">core science communities seeded</div>
            </div>
            <div className="metric">
              <div className="kpi">3</div>
              <div className="muted">subscription tiers</div>
            </div>
            <div className="metric">
              <div className="kpi">1</div>
              <div className="muted">focused MVP</div>
            </div>
          </div>
          <div className="card">
            <h3>What ships in this build</h3>
            <div className="card-list">
              {features.map((feature) => (
                <div key={feature} className="row">
                  <span className="inline-badge">✓</span>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
