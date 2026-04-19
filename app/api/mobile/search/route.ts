import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    if (!query) {
      return Response.json({ results: [] });
    }

    const result = await admin
      .from("search_documents")
      .select("id, source_type, source_id, title, body, url, visibility")
      .ilike("title", `%${query}%`)
      .limit(20);

    if (result.error) throw result.error;

    return Response.json({
      results: result.data ?? []
    });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
