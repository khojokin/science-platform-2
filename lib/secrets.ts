import crypto from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase";

export function fingerprintSecret(secret: string) {
  if (!secret) return "";
  return crypto.createHash("sha256").update(secret).digest("hex").slice(0, 16);
}

export async function logSecretRotation(input: {
  actorId: string;
  provider: string;
  secretName: string;
  previousSecret?: string;
  nextSecret?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("secret_rotation_events")
    .insert({
      actor_id: input.actorId,
      provider: input.provider,
      secret_name: input.secretName,
      previous_fingerprint: input.previousSecret ? fingerprintSecret(input.previousSecret) : null,
      next_fingerprint: input.nextSecret ? fingerprintSecret(input.nextSecret) : null,
      status: "logged",
      notes: input.notes ?? null,
      metadata: input.metadata ?? {}
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
