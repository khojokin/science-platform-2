export default function PlatformLoading() {
  return (
    <div className="stack">
      <section className="card stack">
        <span className="badge">Loading workspace</span>
        <h1 className="page-title">Preparing your science dashboard...</h1>
        <p className="muted">Syncing communities, notifications, and collaboration signals.</p>
      </section>
      <section className="grid two">
        <article className="card" style={{ minHeight: 180 }} />
        <article className="card" style={{ minHeight: 180 }} />
      </section>
      <section className="card" style={{ minHeight: 260 }} />
    </div>
  );
}
