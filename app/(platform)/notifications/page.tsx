import { markAllNotificationsReadAction, markNotificationReadAction } from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { listNotificationsForUser } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";
import { SubmitButton } from "@/components/submit-button";
import { RealtimeNotificationsRefresher } from "@/components/realtime-notifications-refresher";

export default async function NotificationsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const notifications = await listNotificationsForUser(client, userId);

  return (
    <div className="stack">
      <RealtimeNotificationsRefresher userId={userId} />

      <section className="header-row">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-copy">Realtime alerts for follows, comments, and direct messages.</p>
        </div>

        <form action={markAllNotificationsReadAction}>
          <SubmitButton>Mark all as read</SubmitButton>
        </form>
      </section>

      <section className="card-list">
        {notifications.length === 0 ? (
          <div className="empty-state">You are all caught up.</div>
        ) : (
          notifications.map((notification) => (
            <article key={String(notification.id)} className="card stack">
              <div className="row">
                <span className={`inline-badge ${notification.read_at ? "" : "warning"}`}>{String(notification.type)}</span>
                <span className="muted">{formatDate(String(notification.created_at))}</span>
                {notification.actor?.handle ? <span className="muted">@{String(notification.actor.handle)}</span> : null}
              </div>

              <div>
                <strong>{String(notification.title)}</strong>
                <div className="muted">{String(notification.body || "")}</div>
              </div>

              <div className="row">
                {notification.href ? (
                  <a className="button secondary" href={String(notification.href)}>
                    Open
                  </a>
                ) : null}

                {!notification.read_at ? (
                  <form action={markNotificationReadAction}>
                    <input type="hidden" name="notification_id" value={String(notification.id)} />
                    <SubmitButton>Mark read</SubmitButton>
                  </form>
                ) : null}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
