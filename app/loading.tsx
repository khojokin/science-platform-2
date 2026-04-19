import { MarketingShell } from "@/components/marketing-shell";

export default function RootLoading() {
  return (
    <MarketingShell>
      <main className="container marketing-main section stack">
        <section className="card stack">
          <span className="badge">Loading</span>
          <h1 className="page-title">Building your science experience...</h1>
          <p className="muted">Preparing content, communities, and resources.</p>
        </section>
      </main>
    </MarketingShell>
  );
}
