
import Link from "next/link";
import { getInvestorDemoSnapshot } from "@/lib/demo";

export default async function InvestorDemoPage() {
  const snapshot = await getInvestorDemoSnapshot();

  return (
    <main className="container stack" style={{ paddingBlock: "2rem 4rem" }}>
      <div className="hero-banner">
        <div className="stack">
          <span className="badge">Investor mode</span>
          <h1 className="hero-title">A guided story for revenue, retention, and defensibility.</h1>
          <p className="page-copy">
            This showcase compresses the platform into a crisp pitch: sticky science workflows, strong monetization surfaces, and an ops-ready foundation.
          </p>
          <div className="actions">
            <Link className="button" href="/demo">
              Product demo
            </Link>
            <Link className="button secondary" href="/demo/presentation?audience=investors">
              Presentation mode
            </Link>
            <Link className="button secondary" href="/pricing">
              Pricing
            </Link>
          </div>
        </div>
      </div>

      <section className="grid three">
        {snapshot.metrics.map((metric) => (
          <div className="metric" key={metric.label}>
            <div className="kpi">{metric.value}</div>
            <div className="muted">{metric.label}</div>
          </div>
        ))}
      </section>

      <section className="grid two">
        <div className="card stack">
          <h2>Why it wins</h2>
          <div className="card-list">
            <div className="row"><span className="inline-badge success">1</span><span>Built for science learning and collaboration, not generic social posting.</span></div>
            <div className="row"><span className="inline-badge success">2</span><span>Clerk organizations, Supabase search/realtime, Zoom, AI, and mobile create a high-switching-cost product surface.</span></div>
            <div className="row"><span className="inline-badge success">3</span><span>Institution workspaces and expert services open higher-ACV revenue paths.</span></div>
          </div>
        </div>
        <div className="card stack">
          <h2>Growth loop</h2>
          <div className="card-list">
            {snapshot.story.map((item) => (
              <div key={item} className="row">
                <span className="inline-badge">{'→'}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
