import { NextRequest, NextResponse } from "next/server";
import { getMobileBearerUserId } from "@/lib/mobile-auth";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { createLiveKitToken, ensureLiveKitRoom, getCallRoomLivekitName, getLiveKitPublicUrl, hasLiveKit } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  try {
    const userId = await getMobileBearerUserId(request);
    const body = (await request.json().catch(() => ({}))) as { room?: string };
    const roomLookup = String(body.room ?? "").trim();

    if (!roomLookup) {
      return NextResponse.json({ error: "Room is required." }, { status: 400 });
    }

    if (!hasLiveKit()) {
      return NextResponse.json({ error: "LiveKit is not configured." }, { status: 503 });
    }

    const admin = createAdminSupabaseClient();
    const { data: room, error } = await admin
      .from("call_rooms")
      .select("id, slug, title, is_private, host_user_id, max_participants, members:call_room_members(user_id)")
      .or(`id.eq.${roomLookup},slug.eq.${roomLookup}`)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!room) {
      return NextResponse.json({ error: "Room not found." }, { status: 404 });
    }

    const isMember = Array.isArray(room.members) && room.members.some((member: any) => member.user_id === userId);
    if (room.is_private && room.host_user_id !== userId && !isMember) {
      return NextResponse.json({ error: "Access denied." }, { status: 403 });
    }

    const profile = await admin.from("profiles").select("display_name, handle").eq("clerk_user_id", userId).maybeSingle();
    const roomName = getCallRoomLivekitName({ id: String(room.id), slug: String(room.slug ?? room.id) });
    await ensureLiveKitRoom(roomName, room.max_participants);

    const token = await createLiveKitToken({
      roomName,
      userId,
      displayName: profile.data?.display_name || profile.data?.handle || "Scientist",
      metadata: {
        app: "science-platform-mobile",
        callRoomId: room.id,
        callRoomSlug: room.slug
      },
      roomAdmin: room.host_user_id === userId
    });

    return NextResponse.json({
      token,
      url: getLiveKitPublicUrl(),
      roomName,
      provider: "livekit_sfu",
      room
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to issue mobile LiveKit token." }, { status: 500 });
  }
}
