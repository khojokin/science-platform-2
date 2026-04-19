
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { getBillingPortalSubscription } from "@/lib/advanced-queries";

export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const subscription = await getBillingPortalSubscription(userId);
  if (!subscription?.stripe_customer_id) {
    return NextResponse.json({ error: "No Stripe customer found for this account." }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${env.appUrl}/pricing`,
    configuration: env.stripePortalConfigurationId || undefined
  });

  return NextResponse.redirect(session.url, { status: 303 });
}
