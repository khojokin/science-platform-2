import { storeWebhookEvent } from "@/lib/background-jobs";
import Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";

async function upsertSubscription(input: {
  userId: string;
  tier?: string;
  status?: string;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: number | null;
}) {
  const admin = createAdminSupabaseClient();

  await admin.from("subscriptions").upsert(
    {
      user_id: input.userId,
      tier: input.tier ?? "free",
      status: input.status ?? "inactive",
      stripe_customer_id: input.stripeCustomerId ?? null,
      stripe_subscription_id: input.stripeSubscriptionId ?? null,
      stripe_price_id: input.stripePriceId ?? null,
      current_period_end: input.currentPeriodEnd ? new Date(input.currentPeriodEnd * 1000).toISOString() : null
    },
    { onConflict: "user_id" }
  );
}

export async function POST(request: Request) {
  if (!stripe || !env.stripeWebhookSecret) {
    return new Response("Stripe is not configured.", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature.", { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, env.stripeWebhookSecret);
  } catch (error) {
    console.error("Stripe webhook verification failed", error);
    return new Response("Invalid signature", { status: 400 });
  }

  await storeWebhookEvent({
    provider: "stripe",
    eventType: event.type,
    externalId: event.id,
    signatureValid: true,
    payload: event as unknown as Record<string, unknown>
  });

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = String(session.metadata?.userId || "");
    const tier = String(session.metadata?.tier || "starter");

    if (userId) {
      await upsertSubscription({
        userId,
        tier,
        status: "active",
        stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
        stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null
      });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = String(subscription.metadata?.userId || "");
    const item = subscription.items.data[0];

    if (userId) {
      await upsertSubscription({
        userId,
        tier: String(subscription.metadata?.tier || "starter"),
        status: subscription.status,
        stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
        stripeSubscriptionId: subscription.id,
        stripePriceId: item?.price?.id ?? null,
        currentPeriodEnd: "current_period_end" in subscription ? (subscription as unknown as { current_period_end?: number }).current_period_end ?? null : null
      });
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const userId = String(subscription.metadata?.userId || "");

    if (userId) {
      await upsertSubscription({
        userId,
        tier: "free",
        status: "canceled",
        stripeCustomerId: typeof subscription.customer === "string" ? subscription.customer : null,
        stripeSubscriptionId: subscription.id
      });
    }
  }

  return new Response("ok", { status: 200 });
}
