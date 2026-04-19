import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";
import { getSearchContext } from "@/lib/advanced-queries";
import { studyCopilotReply } from "@/lib/openai";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const body = (await request.json()) as { prompt?: string };
    const prompt = String(body.prompt ?? "").trim();

    if (!prompt) {
      return mobileJsonError(400, "Prompt is required.");
    }

    const admin = createAdminSupabaseClient();
    const profileResult = await admin.from("profiles").select("*").eq("clerk_user_id", userId).maybeSingle();
    const profile = profileResult.data;
    const context = await getSearchContext(prompt);

    const answer = await studyCopilotReply({
      prompt,
      context,
      profileSummary: profile ? `${profile.display_name} | ${profile.role} | ${(profile.interests ?? []).join(", ")}` : ""
    });

    return Response.json({ answer, contextUsed: Boolean(context) });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
