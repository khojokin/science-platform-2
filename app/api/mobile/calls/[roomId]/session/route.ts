
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";
import { getRtcIceServers, leaveMobileCallRoom, listMobileCallParticipants, touchMobileCallParticipant } from "@/lib/mobile-calls";

type Context = { params: Promise<{ roomId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { roomId } = await context.params;
    const { userId, profile } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();

    const room = await admin
      .from("call_rooms")
      .select("id, slug, title, description, provider, media_mode, scheduled_for, host_user_id, max_participants")
      .eq("id", roomId)
      .maybeSingle();

    if (room.error) throw room.error;
    if (!room.data) return mobileJsonError(404, "Room not found.");

    await admin.from("call_room_members").upsert({
      call_room_id: roomId,
      user_id: userId,
      role: "member"
    }, { onConflict: "call_room_id,user_id" });

    await touchMobileCallParticipant({
      roomId,
      userId,
      displayName: profile.display_name ?? "Scientist",
      state: "active"
    });

    const participants = await listMobileCallParticipants(roomId);

    return NextResponse.json({
      room: room.data,
      self: { userId, displayName: profile.display_name },
      participants,
      rtcConfig: {
        iceServers: getRtcIceServers(),
        audio: true,
        video: String(room.data.media_mode).includes("video")
      }
    });
  } catch (error) {
    return mobileJsonError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { roomId } = await context.params;
    const { userId, profile } = await requireMobileUser(request);
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const admin = createAdminSupabaseClient();
    await admin.from("call_room_members").upsert({
      call_room_id: roomId,
      user_id: userId,
      role: "member"
    }, { onConflict: "call_room_id,user_id" });

    const participant = await touchMobileCallParticipant({
      roomId,
      userId,
      displayName: profile.display_name ?? "Scientist",
      audioEnabled: body.audioEnabled === false ? false : true,
      videoEnabled: body.videoEnabled === false ? false : true,
      state: String(body.state ?? "active")
    });

    return NextResponse.json({ participant });
  } catch (error) {
    return mobileJsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: Context) {
  try {
    const { roomId } = await context.params;
    const { userId } = await requireMobileUser(request);
    await leaveMobileCallRoom(roomId, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return mobileJsonError(error);
  }
}
