import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { createLiveKitToken, ensureLiveKitRoom, getCallRoomLivekitName, getLiveKitPublicUrl, hasLiveKit } from "@/lib/livekit";
import { getCallRoomForLiveKit } from "@/lib/v9-queries";

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const viewer = await currentUser();
    const body = request.method === "GET"
      ? { room: request.nextUrl.searchParams.get("room") }
      : ((await request.json().catch(() => ({}))) as { room?: string });

    const roomLookup = String(body.room ?? "").trim();
    if (!roomLookup) {
      return NextResponse.json({ error: "Room is required." }, { status: 400 });
    }

    if (!hasLiveKit()) {
      return NextResponse.json({ error: "LiveKit is not configured." }, { status: 503 });
    }

    const client = await createServerSupabaseClient();
    const room = await getCallRoomForLiveKit(client, roomLookup, userId);

    if (!room) {
      return NextResponse.json({ error: "Call room not found or not accessible." }, { status: 404 });
    }

    const roomName = getCallRoomLivekitName({ id: String(room.id), slug: String(room.slug ?? room.id) });
    await ensureLiveKitRoom(roomName, room.max_participants);
    const displayName =
      viewer?.fullName ||
      viewer?.username ||
      viewer?.primaryEmailAddress?.emailAddress?.split("@")[0] ||
      "Scientist";

    const token = await createLiveKitToken({
      roomName,
      userId,
      displayName,
      metadata: {
        app: "science-platform",
        callRoomId: room.id,
        callRoomSlug: room.slug,
        provider: room.provider
      },
      roomAdmin: room.host_user_id === userId
    });

    await client.from("call_room_sfu_sessions").upsert({
      call_room_id: room.id,
      room_name: roomName,
      provider: "livekit",
      status: "active",
      started_by: userId,
      metadata: {
        sourceProvider: room.provider,
        lastTokenIssuedAt: new Date().toISOString()
      }
    }, { onConflict: "call_room_id,room_name" });

    return NextResponse.json({
      token,
      url: getLiveKitPublicUrl(),
      roomName,
      provider: "livekit_sfu",
      room: {
        id: room.id,
        slug: room.slug,
        title: room.title
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to issue LiveKit token." }, { status: 500 });
  }
}
