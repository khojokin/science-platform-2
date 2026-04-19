import { NextRequest } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();

    const memberships = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("user_id", userId);

    if (memberships.error) throw memberships.error;

    const conversationIds = (memberships.data ?? []).map((item) => item.conversation_id);

    if (conversationIds.length === 0) {
      return Response.json({ conversations: [] });
    }

    const [conversationsResult, messagesResult] = await Promise.all([
      admin.from("conversations").select("id, type, title, created_at").in("id", conversationIds),
      admin.from("messages").select("id, conversation_id, sender_id, body, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: false })
    ]);

    if (conversationsResult.error) throw conversationsResult.error;
    if (messagesResult.error) throw messagesResult.error;

    const firstMessageByConversation = new Map<string, any>();
    for (const message of messagesResult.data ?? []) {
      if (!firstMessageByConversation.has(message.conversation_id)) {
        firstMessageByConversation.set(message.conversation_id, message);
      }
    }

    return Response.json({
      conversations: (conversationsResult.data ?? []).map((conversation) => ({
        ...conversation,
        latestMessage: firstMessageByConversation.get(conversation.id) ?? null
      }))
    });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const body = (await request.json()) as { conversationId?: string; text?: string };

    const conversationId = String(body.conversationId ?? "").trim();
    const text = String(body.text ?? "").trim();

    if (!conversationId || !text) {
      return mobileJsonError(400, "conversationId and text are required.");
    }

    const membership = await admin
      .from("conversation_members")
      .select("conversation_id")
      .eq("conversation_id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!membership.data) {
      return mobileJsonError(403, "You are not a member of that conversation.");
    }

    const inserted = await admin
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: userId,
        body: text
      })
      .select("id, conversation_id, sender_id, body, created_at")
      .single();

    if (inserted.error) throw inserted.error;

    return Response.json({ message: inserted.data });
  } catch (error) {
    return mobileJsonError(401, error instanceof Error ? error.message : "Unauthorized.");
  }
}
