import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

export default function SecurityPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Security"
          title="Trust and safety by design"
          copy="Science Platform includes moderation, audit trails, webhook logging, and operational security workflows."
        />

        <section className="grid two">
          <article className="card stack">
            <h3>Platform controls</h3>
            <ul className="clean-list">
              <li>Role-aware access and scoped auth patterns</li>
              <li>Moderation queues and report workflows</li>
              <li>Security-oriented ops pages for rotation and audit exports</li>
            </ul>
          </article>
          <article className="card stack">
            <h3>Data and operations</h3>
            <ul className="clean-list">
              <li>Supabase RLS-aligned access scaffolding</li>
              <li>Background job reliability and restore drills</li>
              <li>Cloudflare edge deployment with health endpoints</li>
            </ul>
          </article>
        </section>
      </main>
    </MarketingShell>
  );
}
