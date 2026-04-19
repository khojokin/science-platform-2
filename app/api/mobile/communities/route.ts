import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const communities = await admin
      .from("communities")
      .select("id, name, slug, description, is_private, created_at")
      .order("created_at", { ascending: true })
      .limit(100);

    if (communities.error) throw communities.error;

    return Response.json({
      communities: communities.data ?? []
    });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
