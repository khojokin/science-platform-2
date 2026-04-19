import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const values = [
  "Evidence-first conversation",
  "Constructive peer learning",
  "Safety, moderation, and trust",
  "Open collaboration with clear attribution"
];

export default function AboutPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="About SciSphere"
          title="Built because science learners deserve better spaces"
          copy="We started Science Platform to replace noisy, generic social feeds with a focused environment for science learning and collaboration."
        />

        <section className="grid two">
          <article className="card stack">
            <h3>Mission</h3>
            <p className="muted">
              Help every student, researcher, and educator learn faster through community, mentorship, and structured collaboration.
            </p>
            <h3>Why general social media fails</h3>
            <ul className="clean-list">
              <li>Low signal-to-noise for technical discussion</li>
              <li>Weak continuity for long-term projects and study paths</li>
              <li>Poor moderation for academic integrity concerns</li>
            </ul>
          </article>

          <article className="card stack">
            <h3>What makes us science-first</h3>
            <ul className="clean-list">
              <li>Subject communities with resources and moderation controls</li>
              <li>Study groups and cohort workflows with scheduling support</li>
              <li>Lab workspaces, recordings, transcript search, and AI support</li>
              <li>Expert network and bounties for high-quality answers</li>
            </ul>
          </article>
        </section>

        <section className="card stack">
          <h3>Values</h3>
          <div className="category-grid">
            {values.map((value) => (
              <article key={value} className="surface-card">
                <strong>{value}</strong>
              </article>
            ))}
          </div>
        </section>

        <section className="card stack">
          <h3>Roadmap focus</h3>
          <p className="muted">
            Next: richer semantic search, institution controls, expanded live collaboration, and deeper mobile workflows.
          </p>
          <div className="actions">
            <Link className="button" href="/sign-up">Create account</Link>
            <Link className="button secondary" href="/demo/presentation">View demo mode</Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
