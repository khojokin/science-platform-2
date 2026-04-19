
import { createVerificationRequestAction } from "@/lib/advanced-actions";
import { listVerificationRequests, listVerifiedExperts } from "@/lib/advanced-queries";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { formatDate } from "@/lib/utils";

export default async function ExpertsPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [experts, requests] = await Promise.all([
    listVerifiedExperts(client),
    listVerificationRequests(client, userId)
  ]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Verified experts</h1>
        <p className="page-copy">Request verification for tutors, researchers, and subject-matter experts, then surface trusted profiles.</p>
      </section>

      <section className="grid two">
        <article className="card">
          <h3>Request verification</h3>
          <form className="form" action={createVerificationRequestAction}>
            <select name="verification_type" defaultValue="expert">
              <option value="expert">Expert / educator</option>
              <option value="researcher">Researcher</option>
              <option value="mentor">Mentor</option>
            </select>
            <input name="evidence_url" placeholder="LinkedIn, institution page, ORCID, website..." />
            <textarea name="note" placeholder="Explain your background, credentials, and what communities you help." required />
            <TurnstileWidget />
            <SubmitButton>Submit request</SubmitButton>
          </form>
        </article>

        <article className="card">
          <h3>Your requests</h3>
          <div className="card-list">
            {requests.length === 0 ? (
              <div className="empty-state">No verification requests yet.</div>
            ) : (
              requests.map((request) => (
                <div className="row" key={request.id}>
                  <span>{request.verification_type}</span>
                  <span className="inline-badge">{request.status}</span>
                  <span className="muted">{formatDate(request.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="card-list">
        {experts.map((expert) => (
          <article key={expert.user_id} className="card stack">
            <div className="row">
              <div>
                <h3 style={{ margin: 0 }}>{expert.profile?.display_name ?? expert.user_id}</h3>
                <div className="muted">{expert.profile?.headline ?? expert.profile?.role ?? "Verified expert"}</div>
              </div>
              <span className="inline-badge success">verified</span>
            </div>
            <div className="row">
              <span className="muted">Score: {expert.score}</span>
              <span className="muted">Helpful answers: {expert.helpful_answers}</span>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
