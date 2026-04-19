
import { auth } from "@clerk/nextjs/server";
import { upsertWorkspaceProfileAction } from "@/lib/advanced-actions";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { listWorkspaceProfiles } from "@/lib/advanced-queries";
import { SubmitButton } from "@/components/submit-button";
import { WorkspaceToolbar } from "@/components/workspace-toolbar";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { formatDate } from "@/lib/utils";

export default async function WorkspacesPage() {
  const userId = await requireUserId();
  const { orgId } = await auth();
  const client = await createServerSupabaseClient();
  const workspaces = await listWorkspaceProfiles(client, userId);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Institution workspaces</h1>
        <p className="page-copy">
          Multi-tenant workspaces for labs, departments, societies, tutoring teams, and student clubs.
        </p>
      </section>

      <section className="grid two">
        <WorkspaceToolbar />

        <article className="card stack">
          <h3>Sync active Clerk Organization</h3>
          <p className="muted">
            Active org: <strong>{orgId ?? "No active organization selected"}</strong>
          </p>
          <form className="form" action={upsertWorkspaceProfileAction}>
            <input name="name" placeholder="Imperial Biophysics Society" required />
            <textarea name="description" placeholder="Who is this workspace for and what do members collaborate on?" required />
            <select name="workspace_type" defaultValue="student_club">
              <option value="lab">Lab</option>
              <option value="institution">Institution</option>
              <option value="student_club">Student club</option>
              <option value="tutoring_team">Tutoring team</option>
            </select>
            <select name="is_public" defaultValue="false">
              <option value="false">Private workspace</option>
              <option value="true">Public workspace</option>
            </select>
            <TurnstileWidget />
            <SubmitButton>Sync workspace profile</SubmitButton>
          </form>
        </article>
      </section>

      <section className="card-list">
        {workspaces.length === 0 ? (
          <div className="empty-state">No workspace profiles yet. Create one from your active Clerk Organization.</div>
        ) : (
          workspaces.map((workspace) => (
            <article key={workspace.id} className="card stack">
              <div className="row">
                <div>
                  <h3 style={{ margin: 0 }}>{workspace.name}</h3>
                  <div className="muted">
                    {workspace.workspace_type.replaceAll("_", " ")} · {workspace.is_public ? "public" : "private"}
                  </div>
                </div>
                <span className="inline-badge">{workspace.slug}</span>
              </div>
              <p className="muted">{workspace.description}</p>
              <div className="row">
                <span className="muted">Clerk org: {workspace.clerk_org_id}</span>
                <span className="muted">Updated {formatDate(workspace.updated_at)}</span>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}
