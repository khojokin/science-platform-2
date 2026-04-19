import { NextRequest, NextResponse } from "next/server";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { stopLiveKitRecording } from "@/lib/livekit";

export async function POST(request: NextRequest) {
  try {
    await requireUserId();
    const body = (await request.json().catch(() => ({}))) as { exportId?: string; egressId?: string };
    const exportId = String(body.exportId ?? "").trim();
    const egressId = String(body.egressId ?? "").trim();
    const client = await createServerSupabaseClient();

    if (!exportId && !egressId) {
      return NextResponse.json({ error: "Provide exportId or egressId." }, { status: 400 });
    }

    let exportRow = null;
    if (exportId) {
      const response = await client.from("call_recording_exports").select("*").eq("id", exportId).maybeSingle();
      if (response.error) throw response.error;
      exportRow = response.data;
    } else {
      const response = await client.from("call_recording_exports").select("*").eq("egress_id", egressId).maybeSingle();
      if (response.error) throw response.error;
      exportRow = response.data;
    }

    if (!exportRow || !exportRow.egress_id) {
      return NextResponse.json({ error: "Recording export not found." }, { status: 404 });
    }

    await stopLiveKitRecording(String(exportRow.egress_id));

    await client
      .from("call_recording_exports")
      .update({
        status: "stopping",
        ended_at: new Date().toISOString()
      })
      .eq("id", exportRow.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to stop LiveKit recording." }, { status: 500 });
  }
}
