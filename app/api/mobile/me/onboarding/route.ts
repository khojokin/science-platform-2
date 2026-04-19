
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const goals = Array.isArray(body.goals) ? body.goals.map((item) => String(item).trim()).filter(Boolean).slice(0, 12) : [];
    const interests = Array.isArray(body.interests) ? body.interests.map((item) => String(item).trim()).filter(Boolean).slice(0, 12) : [];

    const { error } = await admin.rpc("complete_onboarding", {
      selected_track_input: String(body.track ?? "student"),
      goals_input: goals,
      interests_input: interests,
      metadata_input: {
        experience: String(body.experience ?? "")
      }
    });

    if (error) throw error;

    return NextResponse.json({ ok: true, userId });
  } catch (error) {
    return mobileJsonError(error);
  }
}
