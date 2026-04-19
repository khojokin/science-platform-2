import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { toggleCallRoomMembershipAction } from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { LiveCallRoom } from "@/components/live-call-room";
import { ZoomMeetingEmbed } from "@/components/zoom-meeting-embed";
import { LiveKitRoomPanel } from "@/components/livekit-room";
import { ZoomVideoRoom } from "@/components/zoom-video-room";
import { getCallRoomBySlug } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

type CallRoomPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CallRoomPage({ params }: CallRoomPageProps) {
  const { slug } = await params;
  const userId = await requireUserId();
  const viewer = await currentUser();
  const client = await createServerSupabaseClient();
  const room = await getCallRoomBySlug(client, slug, userId);

  if (!room) {
    notFound();
  }

  const displayName =
    viewer?.fullName ||
    viewer?.username ||
    viewer?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
    "Scientist";

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row">
          <span className="pill">{String(room.provider)}</span>
          <span className="inline-badge">{String(room.media_mode)}</span>
          <span className="muted">{room.is_private ? "Private room" : "Public room"}</span>
          <span className="muted">Created {formatDate(String(room.created_at))}</span>
        </div>

        <div>
          <h1 className="page-title">{String(room.title)}</h1>
          <p className="page-copy">{String(room.description)}</p>
        </div>

        <div className="row">
          <form action={toggleCallRoomMembershipAction}>
            <input type="hidden" name="call_room_id" value={String(room.id)} />
            <input type="hidden" name="slug" value={String(room.slug)} />
            <SubmitButton>{room.joined ? "Leave room roster" : "Join room roster"}</SubmitButton>
          </form>
          <span className="muted">Members: {Array.isArray(room.members) ? room.members.length : 0}</span>
        </div>
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Room roster</h3>
          {Array.isArray(room.members) && room.members.length > 0 ? (
            room.members.map((member) => (
              <div key={String(member.user_id)} className="row">
                <span className="inline-badge">{String(member.role)}</span>
                <span>@{String(member.profile?.handle ?? member.user_id)}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">No roster yet.</div>
          )}
        </article>

        <article className="card stack">
          <h3>Connection notes</h3>
          <div className="card-list">
            <div className="row"><span className="inline-badge">A/V</span><span>Grant microphone and camera access when prompted.</span></div>
            <div className="row"><span className="inline-badge">Zoom</span><span>Zoom SDK credentials must be configured on the server.</span></div>
            <div className="row"><span className="inline-badge">Mesh</span><span>Native mesh rooms are best for small groups, not large classes.</span></div>
            <div className="row"><span className="inline-badge">LiveKit</span><span>Use the SFU provider for larger rooms, mobile clients, and exportable recordings.</span></div>
          </div>
        </article>
      </section>

      <section className="card">
        {room.provider === "native_mesh" ? (
          <LiveCallRoom
            roomId={String(room.id)}
            roomSlug={String(room.slug)}
            userId={userId}
            displayName={displayName}
            mediaMode={String(room.media_mode) === "audio" ? "audio" : "video"}
          />
        ) : null}

        {room.provider === "livekit_sfu" ? (
          <LiveKitRoomPanel
            roomIdOrSlug={String(room.slug ?? room.id)}
            roomTitle={String(room.title)}
            mediaMode={String(room.media_mode) === "audio" ? "audio" : "video"}
          />
        ) : null}

        {room.provider === "zoom_video" ? (
          <ZoomVideoRoom
            title={String(room.title)}
            sessionName={String(room.zoom_session_name || room.slug)}
            sessionPassword={String(room.zoom_session_password || "")}
            displayName={displayName}
          />
        ) : null}

        {room.provider === "zoom_meeting" ? (
          room.meeting_number ? (
            <ZoomMeetingEmbed
              meetingNumber={String(room.meeting_number)}
              password={String(room.meeting_password || "")}
              displayName={displayName}
            />
          ) : (
            <div className="empty-state">This Zoom meeting room does not have a meeting number yet.</div>
          )
        ) : null}
      </section>
    </div>
  );
}
