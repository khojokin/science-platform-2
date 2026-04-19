import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const { userId, profile } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();

    const [subscription, unreadNotifications, wallet] = await Promise.all([
      admin.from("subscriptions").select("tier, status, current_period_end").eq("user_id", userId).maybeSingle(),
      admin.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
      admin.from("user_wallets").select("balance_credits").eq("user_id", userId).maybeSingle()
    ]);

    return Response.json({
      profile,
      subscription: subscription.data ?? { tier: "free", status: "inactive", current_period_end: null },
      wallet: wallet.data ?? { balance_credits: 100 },
      unreadNotifications: unreadNotifications.count ?? 0
    });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
