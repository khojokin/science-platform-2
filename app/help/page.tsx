import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const topics = ["Getting started", "Account and authentication", "Communities", "Study groups", "Billing and plans", "Safety and reporting", "Moderation", "Events and recordings"];

export default function HelpPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Help center"
          title="Find answers quickly"
          copy="Search product guidance, onboarding docs, and support topics for your science community workflows."
        />

        <section className="card">
          <input className="search-input" placeholder="Search help topics, e.g. 'how to create a private study group'" />
        </section>

        <section className="category-grid">
          {topics.map((topic) => (
            <article key={topic} className="card stack">
              <h3>{topic}</h3>
              <p className="muted">Guides, common issues, and best practices.</p>
            </article>
          ))}
        </section>

        <section className="card stack">
          <h3>Frequently asked questions</h3>
          <details><summary>How do I report content?</summary><p className="muted">Use in-app reporting on posts, comments, and user profiles. Moderation queues update in real time.</p></details>
          <details><summary>Can I run private communities?</summary><p className="muted">Yes, private communities and groups are available with role-aware controls.</p></details>
          <details><summary>How do institution workspaces operate?</summary><p className="muted">Institutions can create workspaces, assign roles, and monitor activity across cohorts.</p></details>
        </section>
      </main>
    </MarketingShell>
  );
}
