
import { plans } from "@/lib/plans";
import { requireUserId } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase";
import { getSubscriptionForUser } from "@/lib/queries";
import { getWallet } from "@/lib/advanced-queries";
import { formatDate } from "@/lib/utils";

export default async function PricingPage() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const [subscription, wallet] = await Promise.all([getSubscriptionForUser(client, userId), getWallet(client, userId)]);

  return (
    <div className="stack">
      <section>
        <h1 className="page-title">Pricing</h1>
        <p className="page-copy">Freemium by default, with paid tiers for deeper collaboration, searchable knowledge, AI, and premium science tools.</p>
      </section>

      <section className="card">
        <div className="row wrap">
          <span className="inline-badge success">Current tier: {subscription?.tier ?? "free"}</span>
          <span className="muted">Status: {subscription?.status ?? "inactive"}</span>
          <span className="muted">
            {subscription?.current_period_end ? `Renews ${formatDate(subscription.current_period_end)}` : "No active renewal"}
          </span>
          <span className="muted">Wallet: {wallet?.balance_credits ?? 0} credits</span>
          <form action="/api/portal" method="POST">
            <button type="submit">Open billing portal</button>
          </form>
        </div>
      </section>

      <section className="plan-grid">
        {plans.map((plan) => (
          <article key={plan.tier} className="plan stack">
            <div>
              <h3>{plan.name}</h3>
              <div className="muted">{plan.priceLabel}</div>
            </div>
            <p className="muted">{plan.description}</p>

            <form action="/api/checkout" method="POST" className="form">
              <input type="hidden" name="tier" value={plan.tier} />
              <button disabled={!plan.priceId} type="submit">
                {plan.priceId ? `Upgrade to ${plan.name}` : "Add Stripe price ID"}
              </button>
            </form>
          </article>
        ))}
      </section>
    </div>
  );
}
