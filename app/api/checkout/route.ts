import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getPlanByTier } from "@/lib/plans";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured." }, { status: 500 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const tier = String(formData.get("tier") ?? "");
  const plan = getPlanByTier(tier);

  if (!plan?.priceId) {
    return NextResponse.json({ error: "Missing Stripe price configuration." }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    allow_promotion_codes: true,
    success_url: `${env.appUrl}/pricing?checkout=success`,
    cancel_url: `${env.appUrl}/pricing?checkout=cancelled`,
    line_items: [{ price: plan.priceId, quantity: 1 }],
    metadata: {
      userId,
      tier
    },
    subscription_data: {
      metadata: {
        userId,
        tier
      }
    }
  });

  if (!session.url) {
    return NextResponse.json({ error: "Stripe session did not return a URL." }, { status: 500 });
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
