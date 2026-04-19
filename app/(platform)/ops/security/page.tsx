import { getAdminOperationsSnapshot } from "@/lib/analytics";
import { isAdminUser, requireUserId } from "@/lib/auth";
import { logSecretRotationAction, requestAuditExportAction } from "@/lib/v7-actions";
import { formatDate } from "@/lib/utils";

export default async function OpsSecurityPage() {
  const userId = await requireUserId();

  if (!isAdminUser(userId)) {
    return <div className="empty-state">Admin access is required.</div>;
  }

  const snapshot = await getAdminOperationsSnapshot();

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Security and audit</h1>
        <p className="page-copy">
          Log secret rotations, export audit trails, and keep webhook and moderation activity easy to review.
        </p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Log secret rotation</h3>
          <form className="form" action={logSecretRotationAction}>
            <div className="grid two">
              <input name="provider" placeholder="clerk / stripe / supabase / zoom" required />
              <input name="secret_name" placeholder="CLERK_SECRET_KEY" required />
            </div>
            <input name="previous_secret" placeholder="Previous secret value (optional)" />
            <input name="next_secret" placeholder="New secret value (optional)" />
            <textarea name="notes" placeholder="Rotation notes, ticket links, or rollout instructions." />
            <button type="submit">Log rotation</button>
          </form>
        </article>

        <article className="card stack">
          <h3>Request audit export</h3>
          <form className="form" action={requestAuditExportAction}>
            <div className="grid two">
              <select name="format" defaultValue="json">
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
              <select name="scope" defaultValue="ops">
                <option value="ops">Ops</option>
                <option value="moderation">Moderation</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
            <button type="submit">Queue audit export</button>
          </form>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Recent secret rotations</h3>
          {snapshot.secretRotations.length === 0 ? (
            <div className="empty-state">No secret rotations logged yet.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <span>Provider</span>
                <span>Secret</span>
                <span>When</span>
              </div>
              {snapshot.secretRotations.map((item: any) => (
                <div key={item.id} className="table-row">
                  <span>{item.provider}</span>
                  <span>{item.secret_name}</span>
                  <span>{formatDate(item.rotated_at)}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card stack">
          <h3>Audit export requests</h3>
          {snapshot.auditExports.length === 0 ? (
            <div className="empty-state">No audit export requests yet.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <span>Scope</span>
                <span>Status</span>
                <span>Path</span>
              </div>
              {snapshot.auditExports.map((item: any) => (
                <div key={item.id} className="table-row">
                  <span>{item.scope}</span>
                  <span>{item.status}</span>
                  <span>{item.download_path || "pending"}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
