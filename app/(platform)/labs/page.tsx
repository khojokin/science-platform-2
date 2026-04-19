
import {
  createLabNotebookEntryAction,
  createLabProjectAction,
  createResearchClubAction
} from "@/lib/advanced-actions";
import {
  listLabNotebookEntries,
  listLabProjects,
  listPaperSessions,
  listResearchClubs,
  listWorkspaceProfiles
} from "@/lib/advanced-queries";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { PresenceRoom } from "@/components/presence-room";
import { formatDate } from "@/lib/utils";

export default async function LabsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [workspaces, clubs, sessions, projects, notebookEntries] = await Promise.all([
    listWorkspaceProfiles(client, userId),
    listResearchClubs(client),
    listPaperSessions(client),
    listLabProjects(client),
    listLabNotebookEntries(client)
  ]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Labs, paper clubs, and notebooks</h1>
        <p className="page-copy">Run research clubs, track collaborative projects, and keep searchable lab notebook entries.</p>
      </section>

      <PresenceRoom topic="labs:collaboration-lounge" label="Live collaboration presence" />

      <section className="grid two">
        <article className="card">
          <h3>Create a research club</h3>
          <form className="form" action={createResearchClubAction}>
            <select name="workspace_id">
              <option value="">No workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <input name="title" placeholder="Neuroscience paper club" required />
            <textarea name="description" placeholder="What themes, methods, or disciplines will the club discuss?" required />
            <input name="paper_title" placeholder="Optional first paper title" />
            <input name="paper_url" placeholder="Paper URL" />
            <input name="scheduled_for" type="datetime-local" />
            <select name="cadence" defaultValue="weekly">
              <option value="weekly">Weekly</option>
              <option value="biweekly">Biweekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <TurnstileWidget />
            <SubmitButton>Create club</SubmitButton>
          </form>
        </article>

        <article className="card">
          <h3>Create a lab project</h3>
          <form className="form" action={createLabProjectAction}>
            <select name="workspace_id">
              <option value="">No workspace</option>
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <input name="title" placeholder="Protein folding benchmark" required />
            <textarea name="summary" placeholder="Goal, scope, hypotheses, and milestones." required />
            <select name="status" defaultValue="planning">
              <option value="planning">Planning</option>
              <option value="active">Active</option>
              <option value="review">In review</option>
              <option value="complete">Complete</option>
            </select>
            <TurnstileWidget />
            <SubmitButton>Create project</SubmitButton>
          </form>
        </article>
      </section>

      <section className="card">
        <h3>Add a notebook entry</h3>
        <form className="form" action={createLabNotebookEntryAction}>
          <select name="lab_project_id" required>
            <option value="">Choose a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
          <input name="title" placeholder="Experiment 3 observations" required />
          <textarea name="body" placeholder="Record methods, variables, observations, and next steps." required />
          <select name="visibility" defaultValue="team">
            <option value="team">Team only</option>
            <option value="public">Public</option>
          </select>
          <TurnstileWidget />
          <SubmitButton>Save notebook entry</SubmitButton>
        </form>
      </section>

      <section className="grid two">
        <article className="card-list">
          {clubs.map((club) => (
            <article key={club.id} className="card stack">
              <div className="row">
                <h3 style={{ margin: 0 }}>{club.title}</h3>
                <span className="inline-badge">{club.cadence}</span>
              </div>
              <p className="muted">{club.description}</p>
            </article>
          ))}
        </article>

        <article className="card-list">
          {sessions.map((session) => (
            <article key={session.id} className="card stack">
              <div className="row">
                <h3 style={{ margin: 0 }}>{session.paper_title || session.title}</h3>
                <span className="inline-badge">{formatDate(session.scheduled_for)}</span>
              </div>
              {session.paper_url ? (
                <a className="button secondary" href={session.paper_url}>
                  Read paper
                </a>
              ) : null}
            </article>
          ))}
        </article>
      </section>

      <section className="grid two">
        <article className="card-list">
          {projects.map((project) => (
            <article key={project.id} className="card stack">
              <div className="row">
                <h3 style={{ margin: 0 }}>{project.title}</h3>
                <span className="inline-badge">{project.status}</span>
              </div>
              <p className="muted">{project.summary}</p>
            </article>
          ))}
        </article>

        <article className="card-list">
          {notebookEntries.map((entry) => (
            <article key={entry.id} className="card stack">
              <div className="row">
                <h3 style={{ margin: 0 }}>{entry.title}</h3>
                <span className="inline-badge">{entry.visibility}</span>
              </div>
              <p className="muted">{String(entry.body).slice(0, 240)}</p>
              <div className="muted">{formatDate(entry.created_at)}</div>
            </article>
          ))}
        </article>
      </section>
    </div>
  );
}
