
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { getSearchContext } from "@/lib/advanced-queries";
import { studyCopilotReply } from "@/lib/openai";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as { prompt?: string };
  const prompt = String(body.prompt ?? "").trim();

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
  }

  try {
    const admin = createAdminSupabaseClient();
    const profileResult = await admin.from("profiles").select("*").eq("clerk_user_id", userId).maybeSingle();
    const profile = profileResult.data;
    const context = await getSearchContext(prompt);

    const answer = await studyCopilotReply({
      prompt,
      context,
      profileSummary: profile ? `${profile.display_name} | ${profile.role} | ${(profile.interests ?? []).join(", ")}` : ""
    });

    const { data: conversation } = await admin
      .from("ai_conversations")
      .insert({ user_id: userId, title: prompt.slice(0, 80) })
      .select("*")
      .single();

    if (conversation?.id) {
      await admin.from("ai_messages").insert([
        {
          conversation_id: conversation.id,
          role: "user",
          content: prompt
        },
        {
          conversation_id: conversation.id,
          role: "assistant",
          content: answer,
          metadata: { used_context: Boolean(context) }
        }
      ]);
    }

    return NextResponse.json({ answer, contextUsed: Boolean(context) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Copilot request failed."
      },
      { status: 500 }
    );
  }
}
