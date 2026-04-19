
import { createAdminSupabaseClient } from "@/lib/supabase";

export async function createNotificationActionTarget(input: {
  userId: string;
  actorId?: string | null;
  type: "follow" | "comment" | "message" | "system";
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.userId || (input.actorId && input.userId === input.actorId)) {
    return;
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    actor_id: input.actorId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    href: input.href ?? "",
    metadata: input.metadata ?? {}
  });

  if (error) {
    console.error("Failed to create notification", error);
  }
}
