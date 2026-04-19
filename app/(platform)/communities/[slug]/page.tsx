import { notFound } from "next/navigation";
import {
  createCommentAction,
  createPostAction,
  deleteCommentAction,
  deleteCommunityAction,
  deletePostAction,
  reportEntityAction,
  toggleCommunityMembershipAction,
  updateCommentAction,
  updateCommunityAction,
  updatePostAction
} from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { getCommunityBySlug, listCommentsByPostIds, listCommunityMembershipIds, listPostsByCommunity } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

type CommunityPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CommunityPage({ params }: CommunityPageProps) {
  const { slug } = await params;
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();

  const community = await getCommunityBySlug(client, slug);

  if (!community) {
    notFound();
  }

  const [membershipIds, posts] = await Promise.all([
    listCommunityMembershipIds(client, userId),
    listPostsByCommunity(client, community.id)
  ]);

  const comments = await listCommentsByPostIds(
    client,
    posts.map((post) => String(post.id))
  );

  const joined = membershipIds.has(community.id);
  const owned = String(community.created_by) === userId;
  const commentsByPost = new Map<string, typeof comments>();

  for (const comment of comments) {
    const list = commentsByPost.get(String(comment.post_id)) ?? [];
    list.push(comment);
    commentsByPost.set(String(comment.post_id), list);
  }

  return (
    <div className="stack">
      <section className="card stack">
        <div className="row">
          <span className="pill">{community.is_private ? "Private" : "Public"}</span>
          <span className="muted">Created {formatDate(String(community.created_at))}</span>
        </div>
        <div>
          <h1 className="page-title">{String(community.name)}</h1>
          <p className="page-copy">{String(community.description)}</p>
        </div>
        <div className="row">
          <form action={toggleCommunityMembershipAction}>
            <input type="hidden" name="community_id" value={String(community.id)} />
            <input type="hidden" name="slug" value={String(community.slug)} />
            <SubmitButton>{joined ? "Leave community" : "Join community"}</SubmitButton>
          </form>
        </div>

        {owned ? (
          <details>
            <summary>Manage community</summary>
            <div className="stack" style={{ marginTop: "0.75rem" }}>
              <form className="form" action={updateCommunityAction}>
                <input type="hidden" name="community_id" value={String(community.id)} />
                <input type="hidden" name="path" value={`/communities/${community.slug}`} />
                <input name="name" defaultValue={String(community.name)} required />
                <textarea name="description" defaultValue={String(community.description)} required />
                <select name="is_private" defaultValue={community.is_private ? "true" : "false"}>
                  <option value="false">Public</option>
                  <option value="true">Private</option>
                </select>
                <SubmitButton>Save community</SubmitButton>
              </form>

              <form action={deleteCommunityAction}>
                <input type="hidden" name="community_id" value={String(community.id)} />
                <button className="danger" type="submit">Delete community</button>
              </form>
            </div>
          </details>
        ) : null}
      </section>

      <section className="card">
        <h3>New post</h3>
        {!joined ? (
          <div className="empty-state">Join this community to create posts and comments.</div>
        ) : (
          <form className="form" action={createPostAction}>
            <input type="hidden" name="community_id" value={String(community.id)} />
            <input type="hidden" name="path" value={`/communities/${community.slug}`} />
            <input name="title" placeholder="Title" required />
            <textarea name="body" placeholder="Share a question, note, or project update." required />
            <input name="tags" placeholder="Tags, comma separated" />
            <input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.md" />
            <SubmitButton>Publish to community</SubmitButton>
          </form>
        )}
      </section>

      <section className="post-list">
        {posts.length === 0 ? (
          <div className="empty-state">No posts yet. Be the first contributor.</div>
        ) : (
          posts.map((post) => (
            <article key={String(post.id)} className="post-card stack">
              <div className="row">
                <span className="muted">{formatDate(String(post.created_at))}</span>
                <span className="muted">@{String(post.author?.handle || "member")}</span>
              </div>
              <div>
                <h3>{String(post.title)}</h3>
                <div className="post-body">{String(post.body)}</div>
              </div>

              <div className="row">
                {Array.isArray(post.tags)
                  ? post.tags.map((tag) => (
                      <span key={String(tag)} className="inline-badge">
                        #{String(tag)}
                      </span>
                    ))
                  : null}
              </div>

              {Array.isArray(post.attachments) && post.attachments.length > 0 ? (
                <div className="attachment-list">
                  {post.attachments.map((attachment) => (
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

              {String(post.author_id) === userId ? (
                <details>
                  <summary>Manage post</summary>
                  <div className="stack" style={{ marginTop: "0.75rem" }}>
                    <form className="form" action={updatePostAction}>
                      <input type="hidden" name="post_id" value={String(post.id)} />
                      <input type="hidden" name="path" value={`/communities/${community.slug}`} />
                      <input name="title" defaultValue={String(post.title)} required />
                      <textarea name="body" defaultValue={String(post.body)} required />
                      <input
                        name="tags"
                        defaultValue={Array.isArray(post.tags) ? post.tags.join(", ") : ""}
                        placeholder="Tags, comma separated"
                      />
                      <input name="attachment" type="file" accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.md" />
                      <SubmitButton>Save post</SubmitButton>
                    </form>
                    <form action={deletePostAction}>
                      <input type="hidden" name="post_id" value={String(post.id)} />
                      <input type="hidden" name="path" value={`/communities/${community.slug}`} />
                      <button className="danger" type="submit">Delete post</button>
                    </form>
                  </div>
                </details>
              ) : null}

              <div className="divider" />

              <div className="comment-list">
                {(commentsByPost.get(String(post.id)) ?? []).map((comment) => (
                  <div key={comment.id} className="comment-card stack">
                    <div className="row">
                      <span>@{String(comment.author?.handle || "member")}</span>
                      <span className="muted">{formatDate(String(comment.created_at))}</span>
                    </div>
                    <div className="comment-body">{String(comment.body)}</div>

                    {String(comment.author_id) === userId ? (
                      <details>
                        <summary>Manage comment</summary>
                        <div className="stack" style={{ marginTop: "0.75rem" }}>
                          <form className="form" action={updateCommentAction}>
                            <input type="hidden" name="comment_id" value={String(comment.id)} />
                            <input type="hidden" name="path" value={`/communities/${community.slug}`} />
                            <textarea name="body" defaultValue={String(comment.body)} required />
                            <SubmitButton>Save comment</SubmitButton>
                          </form>
                          <form action={deleteCommentAction}>
                            <input type="hidden" name="comment_id" value={String(comment.id)} />
                            <input type="hidden" name="path" value={`/communities/${community.slug}`} />
                            <button className="danger" type="submit">Delete comment</button>
                          </form>
                        </div>
                      </details>
                    ) : null}
                  </div>
                ))}
              </div>

              {joined ? (
                <form className="form" action={createCommentAction}>
                  <input type="hidden" name="post_id" value={String(post.id)} />
                  <input type="hidden" name="path" value={`/communities/${community.slug}`} />
                  <textarea name="body" placeholder="Add a comment" required />
                  <SubmitButton>Comment</SubmitButton>
                </form>
              ) : null}

              <details>
                <summary>Report post</summary>
                <form className="form" action={reportEntityAction}>
                  <input type="hidden" name="path" value={`/communities/${community.slug}`} />
                  <input type="hidden" name="target_type" value="post" />
                  <input type="hidden" name="target_id" value={String(post.id)} />
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
