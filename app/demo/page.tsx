
import Link from "next/link";
import { getDemoScenarios } from "@/lib/demo";

export default async function DemoPage() {
  const scenarios = await getDemoScenarios();

  return (
    <main className="container stack" style={{ paddingBlock: "2rem 4rem" }}>
      <div className="hero-banner">
        <div className="stack">
          <span className="badge">Demo mode</span>
          <h1 className="hero-title">Show the product without requiring a live login.</h1>
          <p className="page-copy">
            Use this walkthrough for customer calls, campus-club pitches, and screenshots. It highlights communities, AI, calls, workspaces, premium plans, and ops maturity.
          </p>
          <div className="actions">
            <Link className="button" href="/demo/investor">
              Investor walkthrough
            </Link>
            <Link className="button secondary" href="/demo/presentation?audience=investors">
              Presentation mode
            </Link>
            <Link className="button secondary" href="/sign-up">
              Create an account
            </Link>
          </div>
        </div>
      </div>

      <div className="grid two">
        {scenarios.map((scenario: any) => (
          <article className="card stack" key={scenario.key}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="badge">{scenario.key}</span>
              <Link className="inline-badge" href={scenario.cta_href}>
                Open
              </Link>
            </div>
            <h2>{scenario.title}</h2>
            <p className="muted">{scenario.summary}</p>
            <div className="grid two">
              {Object.entries((scenario.metrics ?? {}) as Record<string, number | string>).map(([key, value]) => (
                <div className="metric" key={key}>
                  <div className="kpi">{String(value)}</div>
                  <div className="muted">{key}</div>
                </div>
              ))}
            </div>
            <div className="card-list">
              {(scenario.highlights ?? []).map((highlight: string) => (
                <div key={highlight} className="row">
                  <span className="inline-badge success">✓</span>
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
