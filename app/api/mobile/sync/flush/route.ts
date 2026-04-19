
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const body = await request.json().catch(() => ({} as { events?: Array<Record<string, unknown>> }));
    const events = Array.isArray(body.events) ? body.events.slice(0, 100) : [];

    if (events.length === 0) {
      return NextResponse.json({ ok: true, inserted: 0 });
    }

    const payload = events.map((event) => ({
      user_id: userId,
      sync_type: String(event.syncType ?? event.type ?? "mutation"),
      payload: event,
      status: "processed",
      processed_at: new Date().toISOString()
    }));

    const { error } = await admin.from("offline_sync_events").insert(payload);
    if (error) throw error;

    return NextResponse.json({ ok: true, inserted: payload.length });
  } catch (error) {
    return mobileJsonError(error);
  }
}
