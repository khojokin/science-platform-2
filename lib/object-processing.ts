import { createAdminSupabaseClient } from "@/lib/supabase";
import { hasR2, listR2Objects, deleteR2Object, uploadBufferToR2 } from "@/lib/r2";
import { env } from "@/lib/env";

export async function archiveRemoteAsset(input: {
  sourceUrl: string;
  keyPrefix: string;
  filename: string;
  metadata?: Record<string, string>;
}) {
  if (!hasR2()) {
    return { skipped: true as const, reason: "r2-not-configured" as const };
  }

  const response = await fetch(input.sourceUrl);
  if (!response.ok) {
    throw new Error(`Unable to fetch remote asset: ${response.status}`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const key = `${input.keyPrefix.replace(/\/$/, "")}/${Date.now()}-${input.filename}`;

  return uploadBufferToR2({
    key,
    body: bytes,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    metadata: input.metadata
  });
}

export async function registerProcessedArtifact(input: {
  recordingId?: string | null;
  key: string;
  provider: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();

  if (input.recordingId) {
    await admin
      .from("call_recordings")
      .update({
        artifact_key: input.key,
        transcript_status: "ready",
        updated_at: new Date().toISOString()
      })
      .eq("id", input.recordingId);
  }

  await admin.from("backup_manifests").insert({
    provider: input.provider,
    object_key: input.key,
    metadata: input.metadata ?? {}
  });
}

export async function pruneOldBackups(prefix = "backups/") {
  if (!hasR2()) {
    return { pruned: 0 };
  }

  const threshold = Date.now() - env.backupRetentionDays * 24 * 60 * 60 * 1000;
  const objects = await listR2Objects(prefix);
  let pruned = 0;

  for (const object of objects) {
    if (!object.Key || !object.LastModified) continue;
    if (object.LastModified.getTime() >= threshold) continue;
    await deleteR2Object(object.Key);
    pruned += 1;
  }

  return { pruned };
}
