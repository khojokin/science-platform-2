import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

function digest(value: string) {
  return crypto.createHash("sha256").update(`${env.rateLimitSalt}:${value}`).digest("hex");
}

export function buildRateLimitKey(input: {
  action: string;
  userId?: string | null;
  ip?: string | null;
  route?: string | null;
}) {
  const parts = [input.action, input.userId ?? "anon", input.route ?? "global", input.ip ?? "no-ip"];
  return digest(parts.join("|"));
}

export async function consumeRateLimit(input: {
  action: string;
  limit: number;
  windowSeconds: number;
  userId?: string | null;
  ip?: string | null;
  route?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const key = buildRateLimitKey(input);
  const since = new Date(Date.now() - input.windowSeconds * 1000).toISOString();

  const { count, error } = await admin
    .from("request_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("bucket_key", key)
    .gte("created_at", since);

  if (error) throw error;

  if ((count ?? 0) >= input.limit) {
    return {
      ok: false,
      retryAfterSeconds: input.windowSeconds,
      remaining: 0
    };
  }

  const { error: insertError } = await admin.from("request_rate_limits").insert({
    bucket_key: key,
    action: input.action,
    user_id: input.userId ?? null,
    route: input.route ?? null,
    ip_hash: input.ip ? digest(input.ip) : null
  });

  if (insertError) throw insertError;

  return {
    ok: true,
    retryAfterSeconds: input.windowSeconds,
    remaining: Math.max(input.limit - ((count ?? 0) + 1), 0)
  };
}
