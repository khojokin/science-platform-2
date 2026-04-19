import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const events = [
  ["Astrophysics Public Talk", "Apr 28 · 18:00 UTC", "Open"],
  ["Biochemistry Revision Session", "Apr 30 · 17:00 UTC", "Limited seats"],
  ["Neuroscience Paper Club", "May 2 · 15:30 UTC", "Open"],
  ["Climate Data Webinar", "May 5 · 16:00 UTC", "Live + recording"]
];

export default function EventsPublicPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Public events"
          title="Talks, webinars, paper clubs, and community challenges"
          copy="Discover science events hosted by communities, educators, and verified experts."
        />

        <section className="category-grid">
          {events.map(([name, time, status]) => (
            <article key={name} className="card stack">
              <h3>{name}</h3>
              <p className="muted">{time}</p>
              <span className="pill">{status}</span>
              <Link className="button" href="/events">Join event</Link>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
