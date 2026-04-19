import { getAdminOperationsSnapshot } from "@/lib/analytics";
import { isAdminUser, requireUserId } from "@/lib/auth";
import {
  dispatchJobsNowAction,
  enqueueAnalyticsRollupAction,
  enqueueBackupRetentionAction,
  enqueueMaintenanceJobAction,
  enqueueMobileCleanupAction,
  enqueuePushReceiptPollAction,
  enqueueTestEmailAction
} from "@/lib/ops-actions";
import { formatDate } from "@/lib/utils";

export default async function OpsPage() {
  const userId = await requireUserId();

  if (!isAdminUser(userId)) {
    return <div className="empty-state">Admin access is required to open operations.</div>;
  }

  const snapshot = await getAdminOperationsSnapshot();

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Operations</h1>
        <p className="page-copy">
          Run the queue, inspect webhook ingestion, watch the daily product metrics, and keep email and backup flows healthy.
        </p>
      </section>

      <section className="grid four">
        <article className="metric">
          <span className="muted">Queued jobs</span>
          <strong className="metric-value">{snapshot.jobs.filter((job: any) => job.status === "queued").length}</strong>
        </article>
        <article className="metric">
          <span className="muted">Recent webhooks</span>
          <strong className="metric-value">{snapshot.webhooks.length}</strong>
        </article>
        <article className="metric">
          <span className="muted">Email sends</span>
          <strong className="metric-value">{snapshot.emailDeliveries.length}</strong>
        </article>
        <article className="metric">
          <span className="muted">Backup manifests</span>
          <strong className="metric-value">{snapshot.backupManifests.length}</strong>
        </article>
      </section>

      <section className="card stack">
        <h3>Ops areas</h3>
        <div className="row wrap">
          <a className="button secondary" href="/ops/reliability">Reliability</a>
          <a className="button secondary" href="/ops/live">Live media ops</a>
          <a className="button secondary" href="/ops/security">Security & audit</a>
          <a className="button secondary" href="/calendar">Calendar sync</a>
        </div>
      </section>

      <section className="card stack">
        <h3>Runbooks</h3>
        <div className="row wrap">
          <form action={dispatchJobsNowAction}>
            <button type="submit">Dispatch due jobs</button>
          </form>
          <form action={enqueueAnalyticsRollupAction}>
            <button type="submit">Queue analytics rollup</button>
          </form>
          <form action={enqueueMaintenanceJobAction}>
            <button type="submit">Queue maintenance cleanup</button>
          </form>
          <form action={enqueueBackupRetentionAction}>
            <button type="submit">Queue backup retention</button>
          </form>
          <form action={enqueueTestEmailAction}>
            <button type="submit">Queue test email</button>
          </form>
          <form action={enqueuePushReceiptPollAction}>
            <button type="submit">Queue push receipt poll</button>
          </form>
          <form action={enqueueMobileCleanupAction}>
            <button type="submit">Queue mobile cleanup</button>
          </form>
        </div>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Job queue</h3>
          <div className="table">
            <div className="table-head">
              <span>Type</span>
              <span>Status</span>
              <span>Created</span>
            </div>
            {snapshot.jobs.map((job: any) => (
              <div key={job.id} className="table-row">
                <span>{job.job_type}</span>
                <span>{job.status}</span>
                <span>{formatDate(job.created_at)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card stack">
          <h3>Webhook events</h3>
          <div className="table">
            <div className="table-head">
              <span>Provider</span>
              <span>Event</span>
              <span>Received</span>
            </div>
            {snapshot.webhooks.map((event: any) => (
              <div key={event.id} className="table-row">
                <span>{event.provider}</span>
                <span>{event.event_type}</span>
                <span>{formatDate(event.received_at)}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Email deliveries</h3>
          {snapshot.emailDeliveries.length === 0 ? (
            <div className="empty-state">No delivery records yet.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <span>Template</span>
                <span>Status</span>
                <span>Created</span>
              </div>
              {snapshot.emailDeliveries.map((email: any) => (
                <div key={email.id} className="table-row">
                  <span>{email.template_key}</span>
                  <span>{email.status}</span>
                  <span>{formatDate(email.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="card stack">
          <h3>Backups</h3>
          {snapshot.backupManifests.length === 0 ? (
            <div className="empty-state">No backup manifests yet.</div>
          ) : (
            <div className="table">
              <div className="table-head">
                <span>Provider</span>
                <span>Object key</span>
                <span>Created</span>
              </div>
              {snapshot.backupManifests.map((backup: any) => (
                <div key={backup.id} className="table-row">
                  <span>{backup.provider}</span>
                  <span>{backup.object_key}</span>
                  <span>{formatDate(backup.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="card stack">
        <h3>Operational checklist</h3>
        <ul className="clean-list">
          <li>Confirm Sentry DSN and release upload variables are present before production deploys.</li>
          <li>Keep the nightly backup workflow and backup retention job enabled together.</li>
          <li>Verify Resend domain alignment before enabling all transactional email templates.</li>
          <li>Use the mobile API routes only with Clerk bearer tokens from the Expo client.</li>
        </ul>
      </section>
    </div>
  );
}
