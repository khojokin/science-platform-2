
import { createCallRecordingAction } from "@/lib/advanced-actions";
import { listCallRecordings } from "@/lib/advanced-queries";
import { listCallRooms } from "@/lib/queries";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { formatDate } from "@/lib/utils";

export default async function RecordingsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [recordings, rooms] = await Promise.all([listCallRecordings(client, userId), listCallRooms(client, userId)]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Recordings and transcripts</h1>
        <p className="page-copy">
          Save call recordings, attach transcript text, and make sessions searchable across your science knowledge base.
        </p>
      </section>

      <section className="card">
        <h3>Add a recording or transcript</h3>
        <form className="form" action={createCallRecordingAction}>
          <select name="call_room_id">
            <option value="">No room linked</option>
            {rooms.map((room) => (
              <option key={room.id} value={room.id}>
                {room.title}
              </option>
            ))}
          </select>
          <input name="title" placeholder="Organic chemistry office hours – week 2" required />
          <select name="provider" defaultValue="zoom_video">
            <option value="native_mesh">Native browser room</option>
            <option value="zoom_video">Zoom Video SDK</option>
            <option value="zoom_meeting">Zoom Meeting SDK</option>
            <option value="livekit_sfu">LiveKit SFU export</option>
          </select>
          <input name="external_recording_id" placeholder="Optional provider recording/session ID" />
          <textarea name="transcript_text" placeholder="Paste the transcript or notes here to make the session searchable." />
          <select name="is_public" defaultValue="false">
            <option value="false">Private</option>
            <option value="true">Public</option>
          </select>
          <TurnstileWidget />
          <SubmitButton>Save recording</SubmitButton>
        </form>
        <div className="card-list">
          <div className="row"><span className="inline-badge">LiveKit export API</span><span>Start an automated recording export with <code>/api/livekit/egress/start</code> and stop it with <code>/api/livekit/egress/stop</code>.</span></div>
        </div>
      </section>

      <section className="card-list">
        {recordings.map((recording) => (
          <article key={recording.id} className="card stack">
            <div className="row">
              <div>
                <h3 style={{ margin: 0 }}>{recording.title}</h3>
                <div className="muted">
                  {recording.provider} · {formatDate(recording.created_at)}
                </div>
              </div>
              <span className="inline-badge">{recording.transcript_status}</span>
            </div>
            <p className="muted">{String(recording.transcript_text ?? "").slice(0, 340) || "No transcript yet."}</p>
            {recording.room?.slug ? (
              <a className="button secondary" href={`/calls/${recording.room.slug}`}>
                Open room
              </a>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
