
import {
  acceptBountyResponseAction,
  createBountyResponseAction,
  createQuestionBountyAction
} from "@/lib/advanced-actions";
import { getWallet, listBountyResponses, listQuestionBounties } from "@/lib/advanced-queries";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { formatDate } from "@/lib/utils";

export default async function BountiesPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [wallet, bounties] = await Promise.all([getWallet(client, userId), listQuestionBounties(client)]);
  const responses = await listBountyResponses(client, bounties.map((item) => String(item.id)));
  const responsesByBounty = new Map<string, typeof responses>();

  for (const response of responses) {
    const list = responsesByBounty.get(String(response.bounty_id)) ?? [];
    list.push(response);
    responsesByBounty.set(String(response.bounty_id), list);
  }

  return (
    <div className="stack">
      <section className="row">
        <div>
          <h1 className="page-title">Question bounties</h1>
          <p className="page-copy">Spend credits on hard questions and reward the best answer from the community.</p>
        </div>
        <span className="inline-badge success">Wallet: {wallet?.balance_credits ?? 0} credits</span>
      </section>

      <section className="card">
        <h3>Create a bounty</h3>
        <form className="form" action={createQuestionBountyAction}>
          <input name="title" placeholder="Why does this regression model overfit after feature scaling?" required />
          <textarea name="body" placeholder="Add context, data shape, attempted fixes, and what kind of answer you need." required />
          <input name="tags" placeholder="machine learning, statistics, python" />
          <input name="reward_credits" type="number" min="5" max="500" defaultValue="25" required />
          <input name="closes_at" type="datetime-local" />
          <TurnstileWidget />
          <SubmitButton>Post bounty</SubmitButton>
        </form>
      </section>

      <section className="card-list">
        {bounties.map((bounty) => {
          const bountyResponses = responsesByBounty.get(String(bounty.id)) ?? [];
          const isOwner = String(bounty.author_id) === userId;

          return (
            <article key={bounty.id} className="card stack">
              <div className="row">
                <div>
                  <h3 style={{ margin: 0 }}>{bounty.title}</h3>
                  <div className="muted">
                    {bounty.author?.display_name ?? "Scientist"} · {formatDate(bounty.created_at)}
                  </div>
                </div>
                <span className="inline-badge success">{bounty.reward_credits} credits</span>
              </div>

              <p className="muted">{bounty.body}</p>

              <div className="row wrap">
                {(bounty.tags ?? []).map((tag: string) => (
                  <span className="inline-badge" key={tag}>
                    #{tag}
                  </span>
                ))}
                <span className="muted">Status: {bounty.status}</span>
              </div>

              <form className="form" action={createBountyResponseAction}>
                <input type="hidden" name="bounty_id" value={bounty.id} />
                <textarea name="body" placeholder="Write a thoughtful answer with reasoning, sources, or working steps." required />
                <TurnstileWidget />
                <SubmitButton>Answer bounty</SubmitButton>
              </form>

              <div className="card-list">
                {bountyResponses.map((response) => (
                  <article key={response.id} className="card stack">
                    <div className="row">
                      <strong>{response.author?.display_name ?? response.author_id}</strong>
                      <span className="muted">{formatDate(response.created_at)}</span>
                    </div>
                    <p className="muted">{response.body}</p>
                    {isOwner && bounty.status !== "awarded" ? (
                      <form action={acceptBountyResponseAction}>
                        <input type="hidden" name="bounty_id" value={bounty.id} />
                        <input type="hidden" name="response_id" value={response.id} />
                        <button type="submit">Award bounty</button>
                      </form>
                    ) : null}
                  </article>
                ))}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
