import Link from "next/link";
import {
  createCommentAction,
  createPostAction,
  deleteCommentAction,
  deletePostAction,
  reportEntityAction,
  updateCommentAction,
  updatePostAction
} from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { listCommentsByPostIds, listCommunities, listCommunityMembershipIds, listFeedPosts } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function FeedPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();

  const [communities, posts, membershipIds] = await Promise.all([
    listCommunities(client),
    listFeedPosts(client),
    listCommunityMembershipIds(client, userId)
  ]);

  const comments = await listCommentsByPostIds(
    client,
    posts.map((post) => String((post as any).id))
  );

  const commentsByPost = new Map<string, typeof comments>();
  for (const comment of comments) {
    const list = commentsByPost.get(String((comment as any).post_id)) ?? [];
    list.push(comment);
    commentsByPost.set(String((comment as any).post_id), list);
  }

  const writableCommunities = communities.filter((community) => membershipIds.has(community.id));
  const trendingTopics = ["#quantum-mechanics", "#organic-chemistry", "#neuroscience", "#research-methods", "#exam-prep"];

  return (
    <div className="stack">
      <section className="header-row">
        <div>
          <h1 className="page-title">Science feed</h1>
          <p className="page-copy">Post updates, share questions, and collaborate inside your joined communities.</p>
        </div>
      </section>

      <section className="card">
        <h3>Create a post</h3>
        {writableCommunities.length === 0 ? (
          <div className="empty-state">
            Join at least one community before posting. Start in <Link href="/communities">Communities</Link>.
          </div>
        ) : (
          <form className="form" action={createPostAction}>
            <input type="hidden" name="path" value="/feed" />
            <select name="community_id" required>
              <option value="">Choose a community</option>
              {writableCommunities.map((community) => (
                <option key={community.id} value={community.id}>
                  {community.name}
                </option>
              ))}
            </select>
            <input name="title" placeholder="Post title" required />
            <textarea name="body" placeholder="What are you working on, learning, or asking?" required />
            <input name="tags" placeholder="Tags, comma separated" />
            <input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.md" />
            <div className="actions">
              <SubmitButton>Publish post</SubmitButton>
            </div>
          </form>
        )}
      </section>

      <section className="grid two">
        <article className="card stack">
          <h3>Trending topics</h3>
          <div className="row wrap">
            {trendingTopics.map((topic) => (
              <span key={topic} className="inline-badge">{topic}</span>
            ))}
          </div>
        </article>
        <article className="card stack">
          <h3>Recommended communities</h3>
          <div className="card-list">
            {communities.slice(0, 4).map((community) => (
              <div key={community.id} className="row" style={{ justifyContent: "space-between" }}>
                <span>{community.name}</span>
                <Link href={`/communities/${community.slug}`} className="button secondary">Open</Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="post-list">
        {posts.length === 0 ? (
          <div className="empty-state">No posts yet. Seed the first discussion in a community you join.</div>
        ) : (
          posts.map((post) => (
            <article key={String((post as any).id)} className="post-card stack">
              <div className="row">
                <span className="pill">{String((post as any).community?.name || "")}</span>
                <span className="muted">{formatDate(String((post as any).created_at))}</span>
                <Link className="muted" href={`/u/${String((post as any).author?.handle || "")}`}>
                  @{String((post as any).author?.handle || "member")}
                </Link>
              </div>

              <div>
                <h3>{String((post as any).title)}</h3>
                <div className="post-body">{String((post as any).body)}</div>
              </div>

              <div className="row">
                {Array.isArray((post as any).tags)
                  ? (post as any).tags.map((tag: string) => (
                      <span key={String(tag)} className="inline-badge">
                        #{String(tag)}
                      </span>
                    ))
                  : null}
              </div>

              {Array.isArray((post as any).attachments) && (post as any).attachments.length > 0 ? (
                <div className="attachment-list">
                  {(post as any).attachments.map((attachment: any) => (
                    <a
                      key={String(attachment.id)}
                      className="attachment-card"
                      href={String(attachment.signed_url || "#")}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <strong>{String(attachment.file_name)}</strong>
                      <span className="muted">{String(attachment.content_type)}</span>
                    </a>
                  ))}
                </div>
              ) : null}

              {String((post as any).author_id) === userId ? (
                <details>
                  <summary>Manage post</summary>
                  <div className="stack" style={{ marginTop: "0.75rem" }}>
                    <form className="form" action={updatePostAction}>
                      <input type="hidden" name="post_id" value={String((post as any).id)} />
                      <input type="hidden" name="path" value="/feed" />
                      <input name="title" defaultValue={String((post as any).title)} required />
                      <textarea name="body" defaultValue={String((post as any).body)} required />
                      <input
                        name="tags"
                        defaultValue={Array.isArray((post as any).tags) ? (post as any).tags.join(", ") : ""}
                        placeholder="Tags, comma separated"
                      />
                      <input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.md" />
                      <SubmitButton>Save post</SubmitButton>
                    </form>

                    <form action={deletePostAction}>
                      <input type="hidden" name="post_id" value={String((post as any).id)} />
                      <input type="hidden" name="path" value="/feed" />
                      <button className="danger" type="submit">Delete post</button>
                    </form>
                  </div>
                </details>
              ) : null}

              <div className="divider" />

              <div className="comment-list">
                {(commentsByPost.get(String((post as any).id)) ?? []).map((comment) => (
                  <div key={(comment as any).id} className="comment-card stack">
                    <div className="row">
                      <span>@{String((comment as any).author?.handle || "member")}</span>
                      <span className="muted">{formatDate(String((comment as any).created_at))}</span>
                    </div>
                    <div className="comment-body">{String((comment as any).body)}</div>

                    {String((comment as any).author_id) === userId ? (
                      <details>
                        <summary>Manage comment</summary>
                        <div className="stack" style={{ marginTop: "0.75rem" }}>
                          <form className="form" action={updateCommentAction}>
                            <input type="hidden" name="comment_id" value={String((comment as any).id)} />
                            <input type="hidden" name="path" value="/feed" />
                            <textarea name="body" defaultValue={String((comment as any).body)} required />
                            <SubmitButton>Save comment</SubmitButton>
                          </form>
                          <form action={deleteCommentAction}>
                            <input type="hidden" name="comment_id" value={String((comment as any).id)} />
                            <input type="hidden" name="path" value="/feed" />
                            <button className="danger" type="submit">Delete comment</button>
                          </form>
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>

              <form className="form" action={createCommentAction}>
                <input type="hidden" name="post_id" value={String((post as any).id)} />
                <input type="hidden" name="path" value="/feed" />
                <textarea name="body" placeholder="Add a comment" required />
                <SubmitButton>Comment</SubmitButton>
              </form>

              <details>
                <summary>Report post</summary>
                <form className="form" action={reportEntityAction}>
                  <input type="hidden" name="path" value="/feed" />
                  <input type="hidden" name="target_type" value="post" />
                  <input type="hidden" name="target_id" value={String((post as any).id)} />
                  <input name="reason" placeholder="Reason" required />
                  <textarea name="details" placeholder="Additional context" />
                  <SubmitButton>Submit report</SubmitButton>
                </form>
              </details>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
