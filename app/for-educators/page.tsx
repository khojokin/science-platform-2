import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

export default function ForEducatorsPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="For Educators"
          title="Run classes, cohorts, and office hours in one science-native platform"
          copy="Educators can create private communities, manage cohorts, share resources, run events, and track engagement."
        />

        <section className="grid two">
          <article className="card stack">
            <h3>Educator workflows</h3>
            <ul className="clean-list">
              <li>Private class communities with role-based access</li>
              <li>Cohort channels for assignments and discussions</li>
              <li>Office hours, revision sessions, and recordings</li>
              <li>Resource vaults for syllabi, notes, and labs</li>
            </ul>
          </article>
          <article className="card stack">
            <h3>Institution toolkit</h3>
            <ul className="clean-list">
              <li>Workspace-level analytics and moderation controls</li>
              <li>Premium seats for TAs and mentors</li>
              <li>Calendar and notification reliability tooling</li>
              <li>Ops and compliance-ready audit trails</li>
            </ul>
          </article>
        </section>

        <section className="cta-band section">
          <div className="stack">
            <h2 className="section-title">Bring your department or learning program to SciSphere</h2>
            <p className="section-copy">We support educators, tutors, bootcamps, and institutions building science-focused cohorts.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/contact">Talk to us</Link>
            <Link className="button secondary" href="/sign-up">Start free</Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
