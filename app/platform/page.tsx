import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const sections: Array<{ title: string; items: string[] }> = [
  { title: "Collaboration", items: ["Feed", "Communities", "Groups", "Messages", "Labs"] },
  { title: "Learning", items: ["AI Copilot", "Vault", "Bounties", "Events", "Recordings"] },
  { title: "Operations", items: ["Dashboard", "Moderation", "Ops Live", "Ops Reliability", "Ops Security"] }
];

export default function PlatformOverviewPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Platform overview"
          title="Everything inside the Science Platform app"
          copy="Explore the full product surface covering social learning, collaboration workflows, and operational tooling."
        />

        <section className="category-grid">
          {sections.map((section) => (
            <article key={section.title} className="card stack">
              <h3>{section.title}</h3>
              <div className="card-list">
                {section.items.map((item) => (
                  <div key={item} className="row"><span className="inline-badge">•</span><span>{item}</span></div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="cta-band section">
          <div className="stack">
            <h2 className="section-title">Ready to experience the full app?</h2>
            <p className="section-copy">Create your account and move from public site to the full collaborative platform.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/sign-up">Join free</Link>
            <Link className="button secondary" href="/dashboard">Open dashboard</Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
