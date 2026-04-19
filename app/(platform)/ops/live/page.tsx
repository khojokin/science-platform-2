import { requireUserId } from "@/lib/auth";
import { getLiveKitOverview } from "@/lib/v9-queries";
import { formatDate } from "@/lib/utils";

export default async function LiveOpsPage() {
  const userId = await requireUserId();
  const overview = await getLiveKitOverview(userId);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Live media ops</h1>
        <p className="page-copy">
          Inspect SFU rooms, session state, and recording exports. This page complements the standard calls and recordings surfaces.
        </p>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Recent sessions</h3>
          {overview.sessions.length === 0 ? <div className="empty-state">No LiveKit sessions yet.</div> : overview.sessions.map((session: any) => (
            <div key={session.id} className="row">
              <div>
                <div>{session.call_room?.title ?? session.room_name}</div>
                <div className="muted">{session.status} · {formatDate(String(session.started_at))}</div>
              </div>
              <span className="inline-badge">{session.active_participants} active</span>
            </div>
          ))}
        </article>
        <article className="card stack">
          <h3>Recording exports</h3>
          {overview.exports.length === 0 ? <div className="empty-state">No exports yet.</div> : overview.exports.map((record: any) => (
            <div key={record.id} className="row">
              <div>
                <div>{record.call_room?.title ?? record.room_name}</div>
                <div className="muted">{record.status} · {formatDate(String(record.created_at))}</div>
              </div>
              <span className="inline-badge">{record.output_type}</span>
            </div>
          ))}
        </article>
      </section>
    </div>
  );
}
