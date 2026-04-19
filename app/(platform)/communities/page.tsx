import Link from "next/link";
import {
  createCommunityAction,
  deleteCommunityAction,
  toggleCommunityMembershipAction,
  updateCommunityAction
} from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { listCommunities, listCommunityMembershipIds } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function CommunitiesPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [communities, membershipIds] = await Promise.all([listCommunities(client), listCommunityMembershipIds(client, userId)]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Communities</h1>
        <p className="page-copy">Start subject hubs for science discussion, resources, and peer support.</p>
      </section>

      <section className="grid two">
        <article className="card">
          <h3>Create a community</h3>
          <form className="form" action={createCommunityAction}>
            <input name="name" placeholder="Neuroscience, Physics, Exam Prep..." required />
            <textarea name="description" placeholder="Describe who this community is for." required />
            <select name="is_private" defaultValue="false">
              <option value="false">Public</option>
              <option value="true">Private</option>
            </select>
            <div className="actions">
              <SubmitButton>Create community</SubmitButton>
            </div>
          </form>
        </article>

        <article className="card">
          <h3>How to launch well</h3>
          <div className="card-list">
            <div className="row"><span className="inline-badge">1</span><span>Start with clear subject boundaries.</span></div>
            <div className="row"><span className="inline-badge">2</span><span>Seed five useful discussions before inviting users.</span></div>
            <div className="row"><span className="inline-badge">3</span><span>Moderate quickly and set evidence-based rules.</span></div>
          </div>
        </article>
      </section>

      <section className="card-list">
        {communities.map((community) => {
          const joined = membershipIds.has(community.id);
          const owned = String(community.created_by) === userId;

          return (
            <article key={community.id} className="card stack">
              <div className="row">
                <span className="pill">{community.is_private ? "Private" : "Public"}</span>
                <span className="muted">Created {formatDate(String(community.created_at))}</span>
              </div>
              <div>
                <h3>{String(community.name)}</h3>
                <p className="muted">{String(community.description)}</p>
              </div>
              <div className="row">
                <Link className="button secondary" href={`/communities/${community.slug}`}>
                  Open
                </Link>

                <form action={toggleCommunityMembershipAction}>
                  <input type="hidden" name="community_id" value={String(community.id)} />
                  <input type="hidden" name="slug" value={String(community.slug)} />
                  <SubmitButton>{joined ? "Leave" : "Join"}</SubmitButton>
                </form>
              </div>

              {owned ? (
                <details>
                  <summary>Manage community</summary>
                  <div className="stack" style={{ marginTop: "0.75rem" }}>
                    <form className="form" action={updateCommunityAction}>
                      <input type="hidden" name="community_id" value={String(community.id)} />
                      <input type="hidden" name="path" value="/communities" />
                      <input name="name" defaultValue={String(community.name)} required />
                      <textarea name="description" defaultValue={String(community.description)} required />
                      <select name="is_private" defaultValue={community.is_private ? "true" : "false"}>
                        <option value="false">Public</option>
                        <option value="true">Private</option>
                      </select>
                      <SubmitButton>Save changes</SubmitButton>
                    </form>

                    <form action={deleteCommunityAction}>
                      <input type="hidden" name="community_id" value={String(community.id)} />
                      <button className="danger" type="submit">Delete community</button>
                    </form>
                  </div>
                </details>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
