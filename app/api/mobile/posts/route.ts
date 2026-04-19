import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";
import { trackAnalyticsEvent } from "@/lib/analytics";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const body = (await request.json()) as { communityId?: string; title?: string; body?: string; tags?: string[] };

    const communityId = String(body.communityId ?? "").trim();
    const title = String(body.title ?? "").trim();
    const content = String(body.body ?? "").trim();
    const tags = Array.isArray(body.tags) ? body.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8) : [];

    if (!communityId || !title || !content) {
      return mobileJsonError(400, "communityId, title, and body are required.");
    }

    const membership = await admin
      .from("community_members")
      .select("community_id")
      .eq("community_id", communityId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership.data) {
      return mobileJsonError(403, "Join the community before posting from mobile.");
    }

    const inserted = await admin
      .from("posts")
      .insert({
        community_id: communityId,
        author_id: userId,
        title,
        body: content,
        tags
      })
      .select("id, community_id, author_id, title, body, tags, created_at")
      .single();

    if (inserted.error) throw inserted.error;

    await trackAnalyticsEvent({
      eventName: "mobile_post_created",
      userId,
      path: "/api/mobile/posts",
      properties: {
        communityId
      }
    });

    return Response.json({ post: inserted.data });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
