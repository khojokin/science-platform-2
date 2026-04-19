import {
  createStudyGroupAction,
  deleteStudyGroupAction,
  toggleStudyGroupMembershipAction,
  updateStudyGroupAction
} from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { listStudyGroupMembershipIds, listStudyGroups } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";
import { formatDate } from "@/lib/utils";

export default async function GroupsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [groups, memberships] = await Promise.all([listStudyGroups(client), listStudyGroupMembershipIds(client, userId)]);
  const templates = ["Exam sprint", "Paper review circle", "Lab practical prep", "Research collaboration pod"];

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Study groups</h1>
        <p className="page-copy">Create focused groups for revision sessions, lab coordination, and project work.</p>
      </section>

      <section className="grid two">
        <article className="card">
          <h3>Create a study group</h3>
          <form className="form" action={createStudyGroupAction}>
            <input name="name" placeholder="Organic chemistry finals sprint" required />
            <textarea name="description" placeholder="What will the group study or build?" required />
            <select name="visibility" defaultValue="public">
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
            <input name="scheduled_for" type="datetime-local" />
            <SubmitButton>Create group</SubmitButton>
          </form>
        </article>

        <article className="card">
          <h3>High-signal groups work best</h3>
          <div className="card-list">
            <div className="row"><span className="inline-badge">✓</span><span>Keep the scope narrow.</span></div>
            <div className="row"><span className="inline-badge">✓</span><span>Give each session a clear outcome.</span></div>
            <div className="row"><span className="inline-badge">✓</span><span>Prefer recurring sessions over one-offs.</span></div>
          </div>
        </article>
      </section>

      <section className="card stack">
        <h3>Popular group templates</h3>
        <div className="row wrap">
          {templates.map((template) => (
            <span key={template} className="inline-badge">{template}</span>
          ))}
        </div>
      </section>

      <section className="card-list">
        {groups.map((group) => {
          const joined = memberships.has(group.id);
          const owned = String(group.owner_id) === userId;

          return (
            <article key={group.id} className="card stack">
              <div className="row">
                <span className="pill">{String(group.visibility)}</span>
                <span className="muted">Owner @{String((group.owner as any)?.handle)}</span>
                <span className="muted">
                  {group.scheduled_for ? `Next session ${formatDate(String(group.scheduled_for))}` : "Schedule TBD"}
                </span>
              </div>
              <div>
                <h3>{String(group.name)}</h3>
                <p className="muted">{String(group.description)}</p>
              </div>
              <form action={toggleStudyGroupMembershipAction}>
                <input type="hidden" name="study_group_id" value={String(group.id)} />
                <SubmitButton>{joined ? "Leave group" : "Join group"}</SubmitButton>
              </form>

              {owned ? (
                <details>
                  <summary>Manage group</summary>
                  <div className="stack" style={{ marginTop: "0.75rem" }}>
                    <form className="form" action={updateStudyGroupAction}>
                      <input type="hidden" name="study_group_id" value={String(group.id)} />
                      <input name="name" defaultValue={String(group.name)} required />
                      <textarea name="description" defaultValue={String(group.description)} required />
                      <select name="visibility" defaultValue={String(group.visibility)}>
                        <option value="public">Public</option>
                        <option value="private">Private</option>
                      </select>
                      <input
                        name="scheduled_for"
                        type="datetime-local"
                        defaultValue={group.scheduled_for ? String(group.scheduled_for).slice(0, 16) : ""}
                      />
                      <SubmitButton>Save changes</SubmitButton>
                    </form>

                    <form action={deleteStudyGroupAction}>
                      <input type="hidden" name="study_group_id" value={String(group.id)} />
                      <button className="danger" type="submit">Delete group</button>
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
