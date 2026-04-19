import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { buildRecordingFilepath, getCallRoomLivekitName, getLiveKitPublicUrl, hasLiveKit, startLiveKitRoomRecording } from "@/lib/livekit";
import { getCallRoomForLiveKit } from "@/lib/v9-queries";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  try {
    const userId = await requireUserId();
    const body = (await request.json().catch(() => ({}))) as { room?: string };
    const roomLookup = String(body.room ?? "").trim();

    if (!roomLookup) {
      return NextResponse.json({ error: "Room is required." }, { status: 400 });
    }

    if (!hasLiveKit()) {
      return NextResponse.json({ error: "LiveKit is not configured." }, { status: 503 });
    }

    const client = await createServerSupabaseClient();
    const room = await getCallRoomForLiveKit(client, roomLookup, userId);

    if (!room || room.host_user_id !== userId) {
      return NextResponse.json({ error: "Only the room host can start recording exports." }, { status: 403 });
    }

    const roomName = getCallRoomLivekitName({ id: String(room.id), slug: String(room.slug ?? room.id) });
    const objectPath = buildRecordingFilepath(roomName);
    const exportRow = await client
      .from("call_recording_exports")
      .insert({
        call_room_id: room.id,
        provider: "livekit",
        room_name: roomName,
        output_type: "mp4",
        status: "starting",
        storage_bucket: env.livekitR2Bucket || null,
        object_path: objectPath,
        initiated_by: userId,
        metadata: {
          livekitUrl: getLiveKitPublicUrl()
        }
      })
      .select("*")
      .single();

    if (exportRow.error) throw exportRow.error;

    const egress = await startLiveKitRoomRecording(roomName, {
      bucket: env.livekitR2Bucket || undefined,
      filepath: objectPath
    });

    await client
      .from("call_recording_exports")
      .update({
        egress_id: (egress as any)?.egressId ?? null,
        status: "recording",
        started_at: new Date().toISOString(),
        metadata: egress ?? {}
      })
      .eq("id", exportRow.data.id);

    return NextResponse.json({
      ok: true,
      exportId: exportRow.data.id,
      egressId: (egress as any)?.egressId ?? null
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to start LiveKit recording." }, { status: 500 });
  }
}
