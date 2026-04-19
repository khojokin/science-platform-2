
import { reviewVerificationRequestAction, syncSearchIndexAction } from "@/lib/advanced-actions";
import { requireUserId, isAdminUser } from "@/lib/auth";
import { listAuditLogsForAdmin, listReportsForAdmin } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  const userId = await requireUserId();

  if (!isAdminUser(userId)) {
    return (
      <div className="empty-state">
        Admin access is limited to the configured user IDs in <code>ADMIN_USER_IDS</code>.
      </div>
    );
  }

  const client = await createServerSupabaseClient();
  const [reports, logs, verificationRequests] = await Promise.all([
    listReportsForAdmin(),
    listAuditLogsForAdmin(),
    client.from("verification_requests").select("*, profile:profiles!fk_verification_requests_user(display_name, handle)").order("created_at", { ascending: false })
  ]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Admin moderation</h1>
        <p className="page-copy">Review reports, audit logs, verification requests, and jump into the dedicated Moderation and Ops consoles when needed.</p>
      </section>

      <section className="card">
        <div className="row wrap">
          <a className="button secondary" href="/moderation">Open moderation console</a>
          <a className="button secondary" href="/ops">Open ops console</a>
        </div>
        <h3>Admin utilities</h3>
        <form action={syncSearchIndexAction}>
          <SubmitButton>Reindex my admin-visible content</SubmitButton>
        </form>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Verification requests</h3>
          <div className="card-list">
            {(verificationRequests.data ?? []).map((request: any) => (
              <article key={request.id} className="card stack">
                <div className="row">
                  <strong>{request.profile?.display_name ?? request.user_id}</strong>
                  <span className="inline-badge">{request.status}</span>
                </div>
                <div className="muted">{request.verification_type}</div>
                <p className="muted">{request.note}</p>
                {request.evidence_url ? (
                  <a className="button secondary" href={request.evidence_url}>
                    Evidence
                  </a>
                ) : null}
                {request.status === "pending" ? (
                  <div className="row">
                    <form action={reviewVerificationRequestAction}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <input type="hidden" name="decision" value="approved" />
                      <button type="submit">Approve</button>
                    </form>
                    <form action={reviewVerificationRequestAction}>
                      <input type="hidden" name="request_id" value={request.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button type="submit">Reject</button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </article>

        <article className="card stack">
          <h3>Open reports</h3>
          <div className="card-list">
            {reports.map((report) => (
              <div key={report.id} className="card stack">
                <div className="row">
                  <strong>{report.target_type}</strong>
                  <span className="inline-badge">{report.status}</span>
                </div>
                <div className="muted">{report.reason}</div>
                <div className="muted">{formatDate(report.created_at)}</div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card stack">
        <h3>Audit log</h3>
        <div className="card-list">
          {logs.map((log) => (
            <div key={log.id} className="row">
              <span>{log.action}</span>
              <span className="muted">{log.entity_type}</span>
              <span className="muted">{formatDate(log.created_at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
