import Link from "next/link";
import { updateProfileAction } from "@/lib/actions";
import { requireUserId } from "@/lib/auth";
import { SubmitButton } from "@/components/submit-button";
import { getCurrentProfile } from "@/lib/queries";
import { createServerSupabaseClient } from "@/lib/supabase";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const profile = await getCurrentProfile(client, userId);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Your profile</h1>
        <p className="page-copy">Keep your science identity sharp so other learners know how to collaborate with you.</p>
      </section>

      <section className="grid two">
        <article className="card">
          <h3>Edit profile</h3>
          <form className="form" action={updateProfileAction}>
            <input name="display_name" defaultValue={String(profile?.display_name ?? "")} placeholder="Display name" required />
            <input name="handle" defaultValue={String(profile?.handle ?? "")} placeholder="Handle" required />
            <input name="headline" defaultValue={String(profile?.headline ?? "")} placeholder="Headline" />
            <input name="role" defaultValue={String(profile?.role ?? "")} placeholder="Student, tutor, researcher..." />
            <input name="avatar_url" defaultValue={String(profile?.avatar_url ?? "")} placeholder="Avatar URL" />
            <textarea name="bio" defaultValue={String(profile?.bio ?? "")} placeholder="Tell the community what you study or build." />
            <input
              name="interests"
              defaultValue={Array.isArray(profile?.interests) ? profile.interests.join(", ") : ""}
              placeholder="Physics, Biology, Neuroscience"
            />
            <SubmitButton>Save profile</SubmitButton>
          </form>
        </article>

        <article className="card stack">
          <h3>Preview</h3>
          <div className="stack">
            <div className="row">
              <span className="inline-badge">@{String(profile?.handle ?? "handle")}</span>
            </div>
            <div>
              <strong>{String(profile?.display_name ?? "Scientist")}</strong>
              <div className="muted">{String(profile?.headline ?? "Add a headline")}</div>
            </div>
            <p className="muted">{String(profile?.bio ?? "Add a short bio so people know your focus.")}</p>
          </div>
          {profile?.handle ? (
            <Link className="button secondary" href={`/u/${profile.handle}`}>
              View public profile
            </Link>
          ) : null}
        </article>
      </section>
    </div>
  );
}
