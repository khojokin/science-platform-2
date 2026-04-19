import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { toggleFollowAction } from "@/lib/actions";
import { SubmitButton } from "@/components/submit-button";
import { getPublicProfileByHandle, listFollowingIds, listPostsByAuthor } from "@/lib/queries";
import { createPublicSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

type PublicProfilePageProps = {
  params: Promise<{ handle: string }>;
};

export default async function PublicProfilePage({ params }: PublicProfilePageProps) {
  const { handle } = await params;
  const publicClient = createPublicSupabaseClient();
  const profile = await getPublicProfileByHandle(publicClient, handle);

  if (!profile) {
    notFound();
  }

  const posts = await listPostsByAuthor(publicClient, String(profile.clerk_user_id));
  const authObject = await auth();

  let isFollowing = false;

  if (authObject.userId) {
    const client = await createServerSupabaseClient();
    const following = await listFollowingIds(client, authObject.userId);
    isFollowing = following.has(String(profile.clerk_user_id));
  }

  return (
    <main className="container" style={{ paddingBlock: "2rem" }}>
      <div className="stack">
        <section className="card stack">
          <div className="row">
            <span className="inline-badge">@{String(profile.handle)}</span>
            <span className="muted">{String(profile.role ?? "science member")}</span>
            <span className="muted">Joined {formatDate(String(profile.created_at))}</span>
          </div>
          <div>
            <h1 className="page-title" style={{ fontSize: "2.4rem" }}>
              {String(profile.display_name)}
            </h1>
            <p className="page-copy">{String(profile.headline ?? "")}</p>
          </div>
          <p className="muted">{String(profile.bio ?? "No bio yet.")}</p>
          <div className="row">
            {Array.isArray(profile.interests)
              ? profile.interests.map((interest) => (
                  <span key={String(interest)} className="inline-badge">
                    {String(interest)}
                  </span>
                ))
              : null}
          </div>

          <div className="row">
            {authObject.userId && authObject.userId !== String(profile.clerk_user_id) ? (
              <form action={toggleFollowAction}>
                <input type="hidden" name="target_user_id" value={String(profile.clerk_user_id)} />
                <input type="hidden" name="handle" value={String(profile.handle)} />
                <SubmitButton>{isFollowing ? "Unfollow" : "Follow"}</SubmitButton>
              </form>
            ) : authObject.userId ? (
              <span className="muted">This is your public profile.</span>
            ) : (
              <Link className="button" href="/sign-in">
                Sign in to follow
              </Link>
            )}
          </div>
        </section>

        <section className="card-list">
          {posts.length === 0 ? (
            <div className="empty-state">No public posts yet.</div>
          ) : (
            posts.map((post) => (
              <article key={post.id} className="card stack">
                <div className="row">
                  <span className="pill">{String(post.community?.name)}</span>
                  <span className="muted">{formatDate(String(post.created_at))}</span>
                </div>
                <h3>{String(post.title)}</h3>
                <div className="post-body">{String(post.body)}</div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
