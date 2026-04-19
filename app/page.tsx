import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const featuredCategories = ["Physics", "Biology", "Chemistry", "Astronomy", "Neuroscience", "Engineering"];

const stats = [
  { label: "Science communities", value: "120+" },
  { label: "Weekly collaborative sessions", value: "2,400+" },
  { label: "Lab notes and resources", value: "58k+" },
  { label: "Institutions and chapters", value: "85" }
];

const testimonials = [
  {
    quote:
      "Our molecular biology students finally have one place for revision sessions, office hours, and lab collaboration.",
    author: "Dr. Amina Ofori",
    role: "Lecturer, Biomedical Sciences"
  },
  {
    quote: "The signal quality is better than general social apps. Conversations stay focused, useful, and evidence-based.",
    author: "Kojo Mensah",
    role: "Undergrad, Physics"
  },
  {
    quote: "Study groups + bounties + recordings made our exam prep dramatically more structured.",
    author: "Nia Boateng",
    role: "Pre-med student"
  }
];

export default function LandingPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main">
        <section className="hero-grid section">
          <div className="stack">
            <span className="badge">Science-first social learning platform</span>
            <h1 className="hero-title">The collaboration layer for students, researchers, and educators.</h1>
            <p className="page-copy">
              SciSphere unifies communities, study groups, messaging, events, expert access, and premium learning tools in one
              polished workspace built specifically for science.
            </p>
            <div className="actions">
              <Link className="button" href="/sign-up">
                Join free
              </Link>
              <Link className="button secondary" href="/science-communities">
                Explore communities
              </Link>
              <Link className="button ghost" href="/demo/presentation">
                See investor demo
              </Link>
            </div>
          </div>

          <aside className="showcase-card stack">
            <h3>Live product snapshot</h3>
            <div className="surface-grid">
              <article className="surface-card">
                <strong>Community pulse</strong>
                <p className="muted">4,182 new posts this week across exam prep, lab research, and peer mentoring.</p>
              </article>
              <article className="surface-card">
                <strong>Study group velocity</strong>
                <p className="muted">+37% session completion after integrated reminders and recording follow-ups.</p>
              </article>
              <article className="surface-card">
                <strong>AI copilot usage</strong>
                <p className="muted">Top actions: summarize papers, generate flashcards, and build quiz sets.</p>
              </article>
            </div>
          </aside>
        </section>

        <section className="section stat-row">
          {stats.map((stat) => (
            <article key={stat.label} className="stat-card">
              <div className="kpi">{stat.value}</div>
              <p className="muted">{stat.label}</p>
            </article>
          ))}
        </section>

        <section className="section stack">
          <SectionHeader
            badge="Science categories"
            title="Built around real subject depth"
            copy="Join focused spaces where people discuss methods, not noise."
          />
          <div className="category-grid">
            {featuredCategories.map((category) => (
              <article key={category} className="card">
                <h3>{category}</h3>
                <p className="muted">Weekly sessions, curated resources, expert Q&A, and collaborative problem solving.</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section grid two">
          <article className="card stack">
            <SectionHeader
              badge="Why this exists"
              title="General social media is misaligned with science learning"
              copy="Science needs structured conversation, source-backed dialogue, and long-term collaboration memory."
            />
            <ul className="clean-list">
              <li>Focused communities over algorithmic distraction.</li>
              <li>Study groups with cadence, accountability, and shared notes.</li>
              <li>Research-style collaboration with recordings and transcripts.</li>
            </ul>
          </article>

          <article className="card stack">
            <SectionHeader
              badge="Premium tooling"
              title="Upgrade into advanced science workflows"
              copy="Unlock AI study support, expert office hours, vault resources, and institution-ready workspaces."
            />
            <div className="actions">
              <Link className="button" href="/plans">
                View plans
              </Link>
              <Link className="button secondary" href="/pricing">
                In-app pricing
              </Link>
            </div>
          </article>
        </section>

        <section className="section stack">
          <SectionHeader badge="Community voices" title="Loved by science learners and teams" copy="Teams use SciSphere to coordinate, learn, and ship better outcomes." />
          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article key={item.author} className="card stack">
                <p>“{item.quote}”</p>
                <div>
                  <strong>{item.author}</strong>
                  <p className="muted">{item.role}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-band section">
          <div className="stack">
            <h2 className="section-title">Start your science network with structure from day one.</h2>
            <p className="section-copy">Create your account, join subject communities, and unlock premium collaboration when ready.</p>
          </div>
          <div className="actions">
            <Link className="button" href="/sign-up">
              Get started free
            </Link>
            <Link className="button secondary" href="/features">
              Explore all features
            </Link>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
