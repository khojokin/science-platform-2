import Link from "next/link";
import { getSeededInvestorDeck, listDemoShowcaseCards } from "@/lib/v9-queries";

type DemoPresentationPageProps = {
  searchParams: Promise<{ audience?: string }>;
};

const audienceTitle: Record<string, string> = {
  investors: "Investor presentation mode",
  institutions: "Institution presentation mode",
  students: "Student growth presentation mode"
};

export default async function DemoPresentationPage({ searchParams }: DemoPresentationPageProps) {
  const { audience = "investors" } = await searchParams;
  const [deck, cards] = await Promise.all([getSeededInvestorDeck(), listDemoShowcaseCards(audience)]);

  return (
    <main className="container stack" style={{ paddingBlock: "2rem 4rem" }}>
      <section className="hero-banner stack">
        <span className="badge">Presentation mode</span>
        <h1 className="hero-title">{audienceTitle[audience] ?? "Presentation mode"}</h1>
        <p className="page-copy">
          Use this page for screenshots, campus demos, partner walkthroughs, and investor calls. It highlights the strongest story for the selected audience.
        </p>
        <div className="actions">
          <Link className="button" href="/demo/investor">
            Narrative walkthrough
          </Link>
          <Link className="button secondary" href="/demo">
            Back to demo hub
          </Link>
        </div>
      </section>

      <section className="grid four">
        {deck.headlineMetrics.map((metric) => (
          <div key={metric.label} className="metric">
            <div className="kpi">{metric.value}</div>
            <div className="muted">{metric.label}</div>
          </div>
        ))}
      </section>

      <section className="grid two">
        {cards.map((card: any) => (
          <article className="card stack" key={card.key}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="badge">{card.audience}</span>
              <Link className="inline-badge" href={card.route_href}>
                Open
              </Link>
            </div>
            <h2>{card.title}</h2>
            <p className="muted">{card.summary}</p>
            <div className="grid three">
              {Object.entries((card.metrics ?? {}) as Record<string, string | number>).map(([label, value]) => (
                <div key={label} className="metric">
                  <div className="kpi">{String(value)}</div>
                  <div className="muted">{label}</div>
                </div>
              ))}
            </div>
            <div className="card-list">
              {(card.bullets ?? []).map((bullet: string) => (
                <div className="row" key={bullet}>
                  <span className="inline-badge success">✓</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
