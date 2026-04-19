
import { createEventAction, registerForEventAction } from "@/lib/advanced-actions";
import { listEventRegistrationIds, listEvents, listWorkspaceProfiles } from "@/lib/advanced-queries";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { formatDate } from "@/lib/utils";

export default async function EventsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [events, registrations, workspaces] = await Promise.all([
    listEvents(client),
    listEventRegistrationIds(client, userId),
    listWorkspaceProfiles(client, userId)
  ]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Events and sessions</h1>
        <p className="page-copy">Run study sessions, paper clubs, webinars, office hours, competitions, and community events.</p>
      </section>

      <section className="grid three">
        <article className="metric">
          <span className="muted">Upcoming sessions</span>
          <strong className="metric-value">{events.length}</strong>
        </article>
        <article className="metric">
          <span className="muted">Your registrations</span>
          <strong className="metric-value">{registrations.size}</strong>
        </article>
        <article className="metric">
          <span className="muted">Workspaces connected</span>
          <strong className="metric-value">{workspaces.length}</strong>
        </article>
      </section>

      <section className="card">
        <h3>Create an event</h3>
        <form className="form" action={createEventAction}>
          <input name="title" placeholder="Physics finals sprint session" required />
          <textarea name="description" placeholder="What will attendees learn or do?" required />
          <select name="workspace_id">
            <option value="">No workspace</option>
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {workspace.name}
              </option>
            ))}
          </select>
          <div className="grid two">
            <select name="event_type" defaultValue="study_session">
              <option value="study_session">Study session</option>
              <option value="webinar">Webinar</option>
              <option value="office_hours">Office hours</option>
              <option value="competition">Competition</option>
              <option value="paper_club">Paper club</option>
            </select>
            <input name="virtual_url" placeholder="Optional Zoom/call link" />
          </div>
          <div className="grid two">
            <input name="scheduled_for" type="datetime-local" required />
            <input name="ends_at" type="datetime-local" />
          </div>
          <select name="premium_only" defaultValue="false">
            <option value="false">Open to all members</option>
            <option value="true">Premium only</option>
          </select>
          <TurnstileWidget />
          <SubmitButton>Create event</SubmitButton>
        </form>
      </section>

      <section className="card-list">
        {events.map((event) => (
          <article key={event.id} className="card stack">
            <div className="row">
              <div>
                <h3 style={{ margin: 0 }}>{event.title}</h3>
                <div className="muted">
                  {event.organizer?.display_name ?? "Scientist"} · {event.event_type.replaceAll("_", " ")}
                </div>
              </div>
              <span className={`inline-badge ${event.premium_only ? "" : "success"}`}>
                {event.premium_only ? "premium" : "open"}
              </span>
            </div>
            <p className="muted">{event.description}</p>
            <div className="row wrap">
              <span className="muted">{formatDate(event.scheduled_for)}</span>
              {event.virtual_url ? (
                <a className="button secondary" href={event.virtual_url}>
                  Join link
                </a>
              ) : null}
              <form action={registerForEventAction}>
                <input type="hidden" name="event_id" value={event.id} />
                <button type="submit">{registrations.has(event.id) ? "Registered" : "Register"}</button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
