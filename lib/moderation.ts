import { createAdminSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

function countLinks(text: string) {
  return (text.match(/https?:\/\//g) ?? []).length;
}

function repeatedChunks(text: string) {
  const lower = text.toLowerCase();
  const pieces = lower.split(/\s+/).filter(Boolean);
  const seen = new Map<string, number>();

  for (const piece of pieces) {
    seen.set(piece, (seen.get(piece) ?? 0) + 1);
  }

  return Array.from(seen.values()).some((count) => count >= 6);
}

export function scanForModerationIssues(...parts: string[]) {
  const text = parts.join(" ").toLowerCase().trim();
  const issues: string[] = [];

  if (!text) {
    return issues;
  }

  for (const term of env.moderationBlockedTerms) {
    if (term && text.includes(term)) {
      issues.push(`blocked:${term}`);
    }
  }

  if (countLinks(text) >= 4) {
    issues.push("too_many_links");
  }

  if (repeatedChunks(text)) {
    issues.push("repetition");
  }

  return issues;
}

export async function enforceCleanContent(userId: string, action: string, ...parts: string[]) {
  const issues = scanForModerationIssues(...parts);

  if (issues.length === 0) {
    return;
  }

  await logAuditEvent({
    userId,
    action,
    entityType: "moderation",
    entityId: userId,
    metadata: { issues, preview: parts.join(" ").slice(0, 200) }
  });

  throw new Error("This content tripped a moderation check. Please edit and try again.");
}

export async function assertActionRateLimit(input: {
  userId: string;
  action: string;
  limit: number;
  windowSeconds: number;
}) {
  const admin = createAdminSupabaseClient();
  const since = new Date(Date.now() - input.windowSeconds * 1000).toISOString();

  const { count, error } = await admin
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", input.userId)
    .eq("action", input.action)
    .gte("created_at", since);

  if (error) {
    throw error;
  }

  if ((count ?? 0) >= input.limit) {
    throw new Error(`Rate limit hit for ${input.action}. Try again a little later.`);
  }

  const { error: insertError } = await admin.from("rate_limit_events").insert({
    user_id: input.userId,
    action: input.action
  });

  if (insertError) {
    throw insertError;
  }
}

export async function logAuditEvent(input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from("audit_logs").insert({
    actor_id: input.userId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId,
    metadata: input.metadata ?? {}
  });

  if (error) {
    console.error("Failed to persist audit log", error);
  }
}
