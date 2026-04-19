import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("call_rooms")
      .select("id, title, slug, description, provider, media_mode, scheduled_for, zoom_join_url, meeting_number, meeting_password, zoom_session_name")
      .order("scheduled_for", { ascending: true })
      .limit(25);

    if (error) throw error;
    return NextResponse.json({ rooms: data ?? [] });
  } catch (error) {
    return mobileJsonError(error);
  }
}
