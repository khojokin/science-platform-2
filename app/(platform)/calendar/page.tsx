import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { connectGoogleCalendarAction, queueCalendarSyncAction } from "@/lib/v7-actions";
import { formatDate } from "@/lib/utils";

export default async function CalendarPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();

  const [connectionResult, eventsResult] = await Promise.all([
    client.from("calendar_connections").select("*").eq("user_id", userId).eq("provider", "google").maybeSingle(),
    client.from("synced_calendar_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(20)
  ]);

  const connection = connectionResult.data;
  const events = eventsResult.data ?? [];

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Calendar sync</h1>
        <p className="page-copy">
          Connect Google Calendar, push study sessions and live calls into your schedule, and keep your science workflow in sync.
        </p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Calendar connection</h3>
          {connection ? (
            <>
              <p className="muted">Connected to Google Calendar.</p>
              <p className="muted">Scopes: {(connection.scope ?? []).join(", ") || "calendar.events"}</p>
              <p className="muted">Last updated: {formatDate(connection.updated_at)}</p>
            </>
          ) : (
            <>
              <p className="muted">No Google Calendar connected yet.</p>
              <form action={connectGoogleCalendarAction}>
                <button type="submit">Connect Google Calendar</button>
              </form>
            </>
          )}
        </article>

        <article className="card stack">
          <h3>Queue a calendar event</h3>
          <form className="form" action={queueCalendarSyncAction}>
            <input name="title" placeholder="Organic chemistry revision sprint" required />
            <textarea name="description" placeholder="What this session covers." />
            <div className="grid two">
              <input name="starts_at" type="datetime-local" required />
              <input name="ends_at" type="datetime-local" required />
            </div>
            <div className="grid two">
              <input name="source_type" defaultValue="custom_event" />
              <input name="source_id" placeholder="Optional stable source id" />
            </div>
            <input name="join_url" placeholder="Optional call / Zoom URL" />
            <button type="submit">Queue calendar sync</button>
          </form>
        </article>
      </section>

      <section className="card stack">
        <h3>Recent calendar sync jobs</h3>
        {events.length === 0 ? (
          <div className="empty-state">No calendar sync events yet.</div>
        ) : (
          <div className="table">
            <div className="table-head">
              <span>Title</span>
              <span>Status</span>
              <span>Start</span>
            </div>
            {events.map((event: any) => (
              <div key={event.id} className="table-row">
                <span>{event.title}</span>
                <span>{event.status}</span>
                <span>{formatDate(event.starts_at)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
