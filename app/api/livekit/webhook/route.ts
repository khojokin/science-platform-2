import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { verifyLiveKitWebhook } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  const admin = createAdminSupabaseClient();
  const body = await request.text();
  const authHeader = request.headers.get("authorization");

  try {
    const event = await verifyLiveKitWebhook(body, authHeader);
    const eventType = (event as any)?.event || (event as any)?.eventType || "unknown";
    const roomName = (event as any)?.room?.name || (event as any)?.roomName || null;
    const roomSid = (event as any)?.room?.sid || null;
    const egressId = (event as any)?.egressInfo?.egressId || (event as any)?.egress_id || null;
    const status = (event as any)?.egressInfo?.status || (event as any)?.status || null;

    await admin.from("webhook_events").insert({
      provider: "livekit",
      event_type: String(eventType),
      external_id: roomSid || egressId,
      signature_valid: Boolean(event),
      payload: event ?? { raw: body }
    });

    if (roomName) {
      await admin
        .from("call_room_sfu_sessions")
        .update({
          status: String(status ?? eventType),
          livekit_room_sid: roomSid,
          updated_at: new Date().toISOString(),
          ended_at: String(eventType).includes("ended") ? new Date().toISOString() : null
        })
        .eq("room_name", roomName);
    }

    if (egressId) {
      await admin
        .from("call_recording_exports")
        .update({
          status: String(status ?? eventType),
          metadata: event ?? {},
          updated_at: new Date().toISOString(),
          ended_at: String(eventType).includes("ended") ? new Date().toISOString() : null
        })
        .eq("egress_id", egressId);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    await admin.from("webhook_events").insert({
      provider: "livekit",
      event_type: "verification_failed",
      signature_valid: false,
      payload: { raw: body, error: error instanceof Error ? error.message : "unknown" }
    });

    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid LiveKit webhook." }, { status: 400 });
  }
}
