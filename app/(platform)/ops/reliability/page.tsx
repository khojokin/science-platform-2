import { getAdminOperationsSnapshot } from "@/lib/analytics";
import { isAdminUser, requireUserId } from "@/lib/auth";
import { runRestoreDrillAction } from "@/lib/v7-actions";
import { formatDate } from "@/lib/utils";

export default async function OpsReliabilityPage() {
  const userId = await requireUserId();

  if (!isAdminUser(userId)) {
    return <div className="empty-state">Admin access is required.</div>;
  }

  const snapshot = await getAdminOperationsSnapshot();

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Reliability</h1>
        <p className="page-copy">
          Schedule restore drills, inspect backup health, and keep disaster-recovery workflows exercised before you need them.
        </p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Queue a restore drill</h3>
          <form className="form" action={runRestoreDrillAction}>
            <input name="target_environment" defaultValue="staging-restore" />
            <textarea name="notes" placeholder="What should this drill validate?" />
            <button type="submit">Queue restore drill</button>
          </form>
        </article>

        <article className="card stack">
          <h3>Recent backup manifests</h3>
          {snapshot.backupManifests.length === 0 ? (
            <div className="empty-state">No backup manifests yet.</div>
          ) : (
            snapshot.backupManifests.slice(0, 8).map((item: any) => (
              <div key={item.id} className="row">
                <span>{item.provider}</span>
                <span className="muted">{formatDate(item.created_at)}</span>
              </div>
            ))
          )}
        </article>
      </section>

      <section className="card stack">
        <h3>Restore drill history</h3>
        {snapshot.restoreDrills.length === 0 ? (
          <div className="empty-state">No restore drills yet.</div>
        ) : (
          <div className="table">
            <div className="table-head">
              <span>Target</span>
              <span>Status</span>
              <span>Created</span>
            </div>
            {snapshot.restoreDrills.map((drill: any) => (
              <div key={drill.id} className="table-row">
                <span>{drill.target_environment}</span>
                <span>{drill.status}</span>
                <span>{formatDate(drill.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
