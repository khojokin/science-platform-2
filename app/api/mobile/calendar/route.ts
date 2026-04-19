import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();

    const [connection, events] = await Promise.all([
      admin.from("calendar_connections").select("id, provider, external_account_id, updated_at").eq("user_id", userId).eq("provider", "google").maybeSingle(),
      admin.from("synced_calendar_events").select("id, title, starts_at, ends_at, status, join_url, source_type").eq("user_id", userId).order("starts_at", { ascending: true }).limit(30)
    ]);

    if (connection.error) throw connection.error;
    if (events.error) throw events.error;

    return NextResponse.json({
      connection: connection.data,
      events: events.data ?? []
    });
  } catch (error) {
    return mobileJsonError(error);
  }
}
