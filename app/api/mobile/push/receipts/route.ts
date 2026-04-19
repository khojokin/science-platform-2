
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("push_notification_deliveries")
      .select("id, title, body, status, provider_ticket_id, receipt_status, receipt_checked_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ deliveries: data ?? [] });
  } catch (error) {
    return mobileJsonError(error);
  }
}
