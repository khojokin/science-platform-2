import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const communities = [
  ["Physics", "Quantum, mechanics, problem solving", "1,240 active learners"],
  ["Biology", "Molecular, ecology, genetics", "1,540 active learners"],
  ["Chemistry", "Organic, physical, analytical labs", "980 active learners"],
  ["Astronomy", "Cosmology, observation clubs", "710 active learners"],
  ["Mathematics", "Proofs, applied math, exam prep", "1,890 active learners"],
  ["Environmental Science", "Climate, ecosystems, policy", "620 active learners"],
  ["Neuroscience", "Cognition, neural systems", "530 active learners"],
  ["Engineering", "Design, systems, prototyping", "1,110 active learners"],
  ["Medical Science", "Pre-med, clinical pathways", "1,320 active learners"]
];

export default function ScienceCommunitiesPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Science Communities"
          title="Find your subject home"
          copy="Each community includes focused discussions, resources, events, and collaboration opportunities."
        />

        <section className="category-grid">
          {communities.map(([name, desc, activity]) => (
            <article key={name} className="card stack">
              <h3>{name}</h3>
              <p className="muted">{desc}</p>
              <span className="pill">{activity}</span>
              <Link className="button secondary" href="/sign-up">Join {name}</Link>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
