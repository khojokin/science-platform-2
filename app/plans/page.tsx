import Link from "next/link";
import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const plans = [
  { name: "Free", price: "$0", points: ["Core communities", "Feed, groups, messaging", "Basic events"] },
  { name: "Starter", price: "$12/mo", points: ["AI study assistant", "Expanded uploads", "Priority support"] },
  { name: "Pro", price: "$29/mo", points: ["Advanced AI tools", "Vault + recordings", "Expert sessions"] },
  { name: "Team / Institution", price: "Custom", points: ["Workspace controls", "Seat management", "Analytics + reliability"] }
];

export default function PlansPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Pricing plans"
          title="Simple pricing that grows with your science goals"
          copy="Choose a plan for individual learning, premium productivity, or institution-level collaboration."
        />

        <section className="pricing-grid">
          {plans.map((plan) => (
            <article key={plan.name} className="plan stack">
              <h3>{plan.name}</h3>
              <div className="kpi">{plan.price}</div>
              <ul className="clean-list">
                {plan.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
              <Link className="button" href="/sign-up">Choose {plan.name}</Link>
            </article>
          ))}
        </section>

        <section className="card stack">
          <h3>Comparison highlights</h3>
          <div className="table">
            <div className="table-head">
              <span>Feature</span>
              <span>Free</span>
              <span>Paid tiers</span>
            </div>
            <div className="table-row"><span>AI study tools</span><span>Limited</span><span>Full access</span></div>
            <div className="table-row"><span>Storage and recordings</span><span>Basic</span><span>Extended + export</span></div>
            <div className="table-row"><span>Workspace controls</span><span>No</span><span>Team/Institution</span></div>
          </div>
        </section>

        <section className="card stack">
          <h3>FAQ</h3>
          <details><summary>Can I start free?</summary><p className="muted">Yes. Upgrade only when you need advanced collaboration and premium tools.</p></details>
          <details><summary>Do you support institutions?</summary><p className="muted">Yes, with workspace-level controls, seat management, and reliability workflows.</p></details>
        </section>

        <div className="actions">
          <Link className="button" href="/sign-up">Get started</Link>
          <Link className="button secondary" href="/contact">Talk to sales</Link>
        </div>
      </main>
    </MarketingShell>
  );
}
