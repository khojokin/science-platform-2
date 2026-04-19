import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const roles = [
  ["Frontend Engineer", "Build polished learning and collaboration UX"],
  ["Product Designer", "Shape premium science-first interaction flows"],
  ["Developer Relations", "Support educators and community leaders"]
];

export default function CareersPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Careers"
          title="Help build the operating system for science communities"
          copy="We're building high-trust infrastructure for learning and collaboration."
        />
        <section className="category-grid">
          {roles.map(([title, desc]) => (
            <article key={title} className="card stack">
              <h3>{title}</h3>
              <p className="muted">{desc}</p>
              <button type="button" className="button secondary">Apply interest</button>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
