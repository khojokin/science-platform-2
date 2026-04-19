import { getModerationSnapshot } from "@/lib/analytics";
import { isAdminUser, requireUserId } from "@/lib/auth";
import { resolveReportAction, setFeatureFlagAction } from "@/lib/ops-actions";
import { formatDate } from "@/lib/utils";

export default async function ModerationPage() {
  const userId = await requireUserId();

  if (!isAdminUser(userId)) {
    return <div className="empty-state">Admin access is required to open moderation controls.</div>;
  }

  const snapshot = await getModerationSnapshot();

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Moderation and safety</h1>
        <p className="page-copy">Review reports, tune feature flags, and watch for abuse hotspots before they become support tickets.</p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Feature flags</h3>
          <form className="form" action={setFeatureFlagAction}>
            <input name="key" placeholder="new-homepage" required />
            <input name="description" placeholder="Short rollout note" />
            <select name="enabled" defaultValue="false">
              <option value="false">Disabled</option>
              <option value="true">Enabled</option>
            </select>
            <button type="submit">Save flag</button>
          </form>

          <div className="card-list">
            {snapshot.featureFlags.map((flag: any) => (
              <article key={flag.key} className="card stack">
                <div className="row">
                  <strong>{flag.key}</strong>
                  <span className={`inline-badge ${flag.enabled ? "success" : "warning"}`}>
                    {flag.enabled ? "enabled" : "disabled"}
                  </span>
                </div>
                <div className="muted">{flag.description || "No description yet."}</div>
              </article>
            ))}
          </div>
        </article>

        <article className="card stack">
          <h3>Rate-limit hotspots</h3>
          {snapshot.rateLimitHotspots.length === 0 ? (
            <div className="empty-state">No recent hotspots.</div>
          ) : (
            <div className="card-list">
              {snapshot.rateLimitHotspots.slice(0, 12).map((entry: any, index: number) => (
                <article key={`${entry.action}-${index}`} className="card stack">
                  <div className="row">
                    <strong>{entry.action}</strong>
                    <span className="muted">{entry.route || "global"}</span>
                  </div>
                  <span className="muted">{formatDate(entry.created_at)}</span>
                </article>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="card stack">
        <h3>Open reports</h3>
        {snapshot.reports.length === 0 ? (
          <div className="empty-state">No open reports.</div>
        ) : (
          <div className="card-list">
            {snapshot.reports.map((report: any) => (
              <article key={report.id} className="card stack">
                <div className="row">
                  <strong>{report.target_type}</strong>
                  <span className="inline-badge">{report.status}</span>
                </div>
                <div className="muted">Reporter: {report.reporter?.display_name || report.reporter_id}</div>
                <p className="muted">{report.reason}</p>
                <p>{report.details}</p>
                <div className="row wrap">
                  <form action={resolveReportAction} className="inline-form">
                    <input type="hidden" name="report_id" value={report.id} />
                    <input type="hidden" name="status" value="resolved" />
                    <button type="submit">Resolve</button>
                  </form>
                  <form action={resolveReportAction} className="inline-form">
                    <input type="hidden" name="report_id" value={report.id} />
                    <input type="hidden" name="status" value="dismissed" />
                    <button type="submit">Dismiss</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="card stack">
        <h3>Recent audit trail</h3>
        <div className="table">
          <div className="table-head">
            <span>Action</span>
            <span>Entity</span>
            <span>When</span>
          </div>
          {snapshot.auditLogs.map((log: any) => (
            <div key={log.id} className="table-row">
              <span>{log.action}</span>
              <span>{log.entity_type}:{log.entity_id}</span>
              <span>{formatDate(log.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
