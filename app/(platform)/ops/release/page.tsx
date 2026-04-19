import { requireUserId } from "@/lib/auth";

const checks = [
  ["Database migrations", "Ready"],
  ["Background jobs", "Healthy"],
  ["Webhook replay audit", "No blockers"],
  ["Live call fallback path", "Verified"],
  ["Billing checkout smoke", "Pending QA" ]
];

export default async function OpsReleasePage() {
  await requireUserId();

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Release readiness</h1>
        <p className="page-copy">Track launch signals, readiness checks, and production rollout confidence.</p>
      </section>

      <section className="card stack">
        <h3>Release checklist</h3>
        <div className="table">
          <div className="table-head">
            <span>Signal</span>
            <span>Status</span>
            <span>Notes</span>
          </div>
          {checks.map(([name, status]) => (
            <div key={name} className="table-row">
              <span>{name}</span>
              <span>{status}</span>
              <span className="muted">Updated in last 24h</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
