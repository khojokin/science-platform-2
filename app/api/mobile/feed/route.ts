import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    await requireMobileUser(request);
    const admin = createAdminSupabaseClient();

    const postsResult = await admin
      .from("posts")
      .select("id, community_id, author_id, title, body, tags, created_at")
      .order("created_at", { ascending: false })
      .limit(25);

    if (postsResult.error) {
      throw postsResult.error;
    }

    const posts = postsResult.data ?? [];
    const communityIds = [...new Set(posts.map((post) => post.community_id))];
    const authorIds = [...new Set(posts.map((post) => post.author_id))];

    const [communitiesResult, authorsResult, commentsResult] = await Promise.all([
      communityIds.length
        ? admin.from("communities").select("id, name, slug").in("id", communityIds)
        : Promise.resolve({ data: [], error: null }),
      authorIds.length
        ? admin.from("profiles").select("clerk_user_id, display_name, handle, avatar_url").in("clerk_user_id", authorIds)
        : Promise.resolve({ data: [], error: null }),
      posts.length
        ? admin.from("comments").select("id, post_id").in("post_id", posts.map((post) => post.id))
        : Promise.resolve({ data: [], error: null })
    ]);

    if (communitiesResult.error) throw communitiesResult.error;
    if (authorsResult.error) throw authorsResult.error;
    if (commentsResult.error) throw commentsResult.error;

    const communities = new Map((communitiesResult.data ?? []).map((item: any) => [item.id, item]));
    const authors = new Map((authorsResult.data ?? []).map((item: any) => [item.clerk_user_id, item]));
    const commentCounts = new Map<string, number>();

    for (const comment of commentsResult.data ?? []) {
      commentCounts.set(comment.post_id, (commentCounts.get(comment.post_id) ?? 0) + 1);
    }

    return Response.json({
      posts: posts.map((post) => ({
        id: post.id,
        title: post.title,
        body: post.body,
        tags: post.tags ?? [],
        createdAt: post.created_at,
        commentsCount: commentCounts.get(post.id) ?? 0,
        community: communities.get(post.community_id) ?? null,
        author: authors.get(post.author_id) ?? null
      }))
    });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
