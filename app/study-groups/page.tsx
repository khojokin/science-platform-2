import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const useCases = ["Exam preparation cohorts", "Research paper reading circles", "Problem-solving squads", "Lab practical prep teams"];

export default function StudyGroupsPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Study Groups"
          title="Structured group learning that actually sticks"
          copy="Create public or private groups with schedules, shared boards, resource drops, and accountable learning loops."
        />

        <section className="grid two">
          <article className="card stack">
            <h3>Why groups matter</h3>
            <ul className="clean-list">
              <li>Consistency through recurring sessions and reminders</li>
              <li>Faster understanding through peer explanation</li>
              <li>Shared notes, files, and milestone tracking</li>
            </ul>
          </article>
          <article className="card stack">
            <h3>Common use cases</h3>
            <div className="card-list">
              {useCases.map((item) => (
                <div key={item} className="row"><span className="inline-badge">•</span><span>{item}</span></div>
              ))}
            </div>
          </article>
        </section>

        <section className="category-grid">
          {[
            ["Organic Chemistry Sprint", "Private", "Tue/Thu · 7pm"],
            ["Neuroscience Journal Club", "Public", "Fridays · 5pm"],
            ["Calculus Problem Marathon", "Public", "Weekends" ]
          ].map(([name, visibility, schedule]) => (
            <article key={name} className="card stack">
              <h3>{name}</h3>
              <div className="row">
                <span className="pill">{visibility}</span>
                <span className="muted">{schedule}</span>
              </div>
              <Link className="button" href="/groups">Create or join</Link>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
