
import { createCampusChapterAction, joinCampusChapterAction } from "@/lib/advanced-actions";
import { listCampusChapters, listChapterMembershipIds, listReputationLeaderboard } from "@/lib/advanced-queries";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";

export default async function AmbassadorsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [chapters, membershipIds, leaderboard] = await Promise.all([
    listCampusChapters(client),
    listChapterMembershipIds(client, userId),
    listReputationLeaderboard(client)
  ]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Campus chapters and ambassadors</h1>
        <p className="page-copy">Create local chapters, grow science communities on campus, and reward trusted contributors.</p>
      </section>

      <section className="grid two">
        <article className="card">
          <h3>Create a chapter</h3>
          <form className="form" action={createCampusChapterAction}>
            <input name="name" placeholder="Women in Physics" required />
            <input name="campus_name" placeholder="University / school name" required />
            <input name="region" placeholder="London, Lagos, Nairobi..." required />
            <textarea name="description" placeholder="Who is the chapter for and what will it organise?" required />
            <TurnstileWidget />
            <SubmitButton>Create chapter</SubmitButton>
          </form>
        </article>

        <article className="card">
          <h3>Contributor leaderboard</h3>
          <div className="card-list">
            {leaderboard.map((entry) => (
              <div className="row" key={entry.user_id}>
                <span>{entry.profile?.display_name ?? entry.user_id}</span>
                <span className="inline-badge success">{entry.score}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="card-list">
        {chapters.map((chapter) => (
          <article key={chapter.id} className="card stack">
            <div className="row">
              <div>
                <h3 style={{ margin: 0 }}>{chapter.name}</h3>
                <div className="muted">{chapter.campus_name} · {chapter.region}</div>
              </div>
              <span className="inline-badge">{chapter.slug}</span>
            </div>
            <p className="muted">{chapter.description}</p>
            <div className="row">
              <span className="muted">Lead: {chapter.lead?.display_name ?? chapter.lead_user_id}</span>
              <form action={joinCampusChapterAction}>
                <input type="hidden" name="chapter_id" value={chapter.id} />
                <button type="submit">{membershipIds.has(chapter.id) ? "Joined" : "Join chapter"}</button>
              </form>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
