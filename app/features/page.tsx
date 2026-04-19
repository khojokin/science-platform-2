import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const featureGroups = [
  {
    title: "Core collaboration",
    items: ["Communities", "Posts and commenting", "Direct messaging", "Study groups", "Project collaboration"]
  },
  {
    title: "Learning acceleration",
    items: ["AI study copilot", "Vault resources", "Expert network", "Events and sessions", "Search and discovery"]
  },
  {
    title: "Operations and control",
    items: ["Admin analytics", "Moderation tooling", "Feature flags", "Audit logs", "Reliability workflows"]
  }
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Features"
          title="Everything needed to run a science-first social learning platform"
          copy="From peer discussion to premium collaboration tooling, every surface is organized for educational outcomes."
        />

        <section className="category-grid">
          {featureGroups.map((group) => (
            <article key={group.title} className="card stack">
              <h3>{group.title}</h3>
              <div className="card-list">
                {group.items.map((item) => (
                  <div key={item} className="row">
                    <span className="inline-badge">✓</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
