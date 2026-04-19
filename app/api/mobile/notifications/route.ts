import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const result = await admin
      .from("notifications")
      .select("id, title, body, href, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (result.error) throw result.error;

    return Response.json({ notifications: result.data ?? [] });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const body = await request.json().catch(() => ({}));
    const notificationId = typeof body.notificationId === "string" ? body.notificationId : null;

    let query = admin.from("notifications").update({ is_read: true }).eq("user_id", userId);

    if (notificationId) {
      query = query.eq("id", notificationId);
    }

    const result = await query;
    if (result.error) throw result.error;

    return Response.json({ ok: true });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
