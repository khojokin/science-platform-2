import Link from "next/link";
import { createCallRoomAction, toggleCallRoomMembershipAction } from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { listCallRooms } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function CallsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const rooms = await listCallRooms(client, userId);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Live calls</h1>
        <p className="page-copy">
          Add small-group native audio and video rooms, Zoom Video SDK sessions, or embedded Zoom meetings for classes and office hours.
        </p>
      </section>

      <section className="grid two">
        <article className="card">
          <h3>Create a room</h3>
          <form className="form" action={createCallRoomAction}>
            <input name="title" placeholder="Quantum mechanics revision room" required />
            <input name="slug" placeholder="Optional custom slug" />
            <textarea name="description" placeholder="Describe the room purpose and who should join." required />
            <div className="grid two">
              <select name="provider" defaultValue="native_mesh">
                <option value="native_mesh">Native browser mesh</option>
                <option value="zoom_video">Zoom Video SDK room</option>
                <option value="zoom_meeting">Zoom Meeting embed</option>
                <option value="livekit_sfu">LiveKit SFU room</option>
              </select>
              <select name="media_mode" defaultValue="video">
                <option value="video">Video + audio</option>
                <option value="audio">Audio first</option>
              </select>
            </div>
            <div className="grid two">
              <input name="meeting_number" placeholder="Zoom meeting number (optional)" />
              <input name="meeting_password" placeholder="Zoom meeting password (optional)" />
            </div>
            <div className="grid two">
              <input name="zoom_session_name" placeholder="Zoom Video session name" />
              <input name="zoom_session_password" placeholder="Zoom Video session password" />
            </div>
            <div className="grid two">
              <input name="scheduled_for" type="datetime-local" />
              <input name="max_participants" type="number" min="2" max="100" defaultValue="12" />
            </div>
            <label className="row">
              <input style={{ width: "auto" }} name="is_private" type="checkbox" value="true" />
              <span>Private room</span>
            </label>
            <SubmitButton>Create live room</SubmitButton>
          </form>
        </article>

        <article className="card">
          <h3>Provider notes</h3>
          <div className="card-list">
            <div className="row"><span className="inline-badge">Native</span><span>Best for small ad-hoc rooms using WebRTC mesh.</span></div>
            <div className="row"><span className="inline-badge">Zoom Video</span><span>Best for branded in-app sessions using Zoom infrastructure.</span></div>
            <div className="row"><span className="inline-badge">Zoom Meeting</span><span>Best for classes that already run on standard Zoom meetings.</span></div>
            <div className="row"><span className="inline-badge">LiveKit SFU</span><span>Best for larger in-app rooms, stronger reliability, and recording exports.</span></div>
          </div>
        </article>
      </section>

      <section className="card-list">
        {rooms.length === 0 ? (
          <div className="empty-state">No rooms yet. Create the first live room above.</div>
        ) : (
          rooms.map((room) => (
            <article key={String(room.id)} className="card stack">
              <div className="row">
                <span className="pill">{String(room.provider)}</span>
                <span className="inline-badge">{String(room.media_mode)}</span>
                <span className="muted">{room.is_private ? "Private" : "Public"}</span>
                <span className="muted">Created {formatDate(String(room.created_at))}</span>
              </div>
              <div>
                <h3>{String(room.title)}</h3>
                <p className="muted">{String(room.description)}</p>
              </div>
              <div className="row">
                <Link className="button secondary" href={`/calls/${room.slug}`}>
                  Open room
                </Link>
                <form action={toggleCallRoomMembershipAction}>
                  <input type="hidden" name="call_room_id" value={String(room.id)} />
                  <input type="hidden" name="slug" value={String(room.slug)} />
                  <SubmitButton>{room.joined ? "Leave room" : "Join room"}</SubmitButton>
                </form>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
