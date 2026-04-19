import { env } from "@/lib/env";

export const plans = [
  {
    tier: "starter",
    name: "Starter",
    priceLabel: "Low-cost learner plan",
    description: "Unlimited communities, more messages, better profiles.",
    priceId: env.stripeStarterPriceId
  },
  {
    tier: "pro",
    name: "Pro",
    priceLabel: "For serious students and early researchers",
    description: "Advanced group tools, premium content, file sharing, study planning.",
    priceId: env.stripeProPriceId
  },
  {
    tier: "team",
    name: "Team / Institution",
    priceLabel: "For clubs, labs, and schools",
    description: "Private branded communities, member management, analytics.",
    priceId: env.stripeTeamPriceId
  }
] as const;

export type PlanTier = (typeof plans)[number]["tier"];

export function getPlanByTier(tier: string) {
  return plans.find((plan) => plan.tier === tier) ?? null;
}
