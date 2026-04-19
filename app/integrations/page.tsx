import { MarketingShell, SectionHeader } from "@/components/marketing-shell";

const integrations = [
  ["Clerk", "Authentication and identity"],
  ["Supabase", "Database, storage, realtime"],
  ["Stripe", "Subscriptions and billing"],
  ["LiveKit", "Production live calls"],
  ["Zoom", "Meeting and video SDK support"],
  ["Cloudflare Workers", "OpenNext edge deployment"],
  ["Resend", "Transactional email scaffolding"],
  ["Sentry", "Observability and alerting"]
];

export default function IntegrationsPage() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <SectionHeader
          badge="Integrations"
          title="Production-ready integrations for a real platform"
          copy="SciSphere is structured for modern full-stack operations, from auth and billing to real-time collaboration and deployment."
        />

        <section className="category-grid">
          {integrations.map(([name, detail]) => (
            <article key={name} className="card stack">
              <h3>{name}</h3>
              <p className="muted">{detail}</p>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
