"use client";

export default function PlatformError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="stack">
      <section className="card stack">
        <span className="inline-badge warning">Something went wrong</span>
        <h1 className="page-title">We couldn't load this workspace view</h1>
        <p className="muted">{error.message || "Unexpected platform error."}</p>
        <div className="actions">
          <button type="button" onClick={reset}>Try again</button>
        </div>
      </section>
    </div>
  );
}
