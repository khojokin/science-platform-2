import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const updates = [
  ["v0.13", "Public site redesign, expanded routes, richer app surfaces"],
  ["v0.12", "Live collaboration scaffolding with events and recordings"],
  ["v0.11", "Mobile API expansion and reliability tooling"]
];

export default function ChangelogPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Changelog"
          title="Product updates and release notes"
          copy="Track what changed across product UX, collaboration systems, and ops reliability."
        />
        <section className="card stack">
          {updates.map(([version, note]) => (
            <div key={version} className="table-row">
              <strong>{version}</strong>
              <span>{note}</span>
              <span className="muted">April 2026</span>
            </div>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
