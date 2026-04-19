import { createAdminSupabaseClient } from "@/lib/supabase";
import { hasR2, uploadBufferToR2 } from "@/lib/r2";
import { env } from "@/lib/env";

export async function createAuditExport(input: {
  requestId: string;
  scope: string;
  format: "json" | "csv";
}) {
  const admin = createAdminSupabaseClient();

  const [auditLogs, reports, moderationActions, webhooks, restoreDrills, secretRotations] = await Promise.all([
    admin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(2000),
    admin.from("reports").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("moderation_actions").select("*").order("created_at", { ascending: false }).limit(1000),
    admin.from("webhook_events").select("*").order("received_at", { ascending: false }).limit(1000),
    admin.from("restore_drills").select("*").order("created_at", { ascending: false }).limit(200),
    admin.from("secret_rotation_events").select("*").order("created_at", { ascending: false }).limit(200)
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    scope: input.scope,
    auditLogs: auditLogs.data ?? [],
    reports: reports.data ?? [],
    moderationActions: moderationActions.data ?? [],
    webhookEvents: webhooks.data ?? [],
    restoreDrills: restoreDrills.data ?? [],
    secretRotations: secretRotations.data ?? []
  };

  const extension = input.format === "csv" ? "csv" : "json";
  let body = "";

  if (input.format === "csv") {
    body = [
      "type,id,created_at,summary",
      ...(payload.auditLogs.map((row: any) => `audit,${row.id},${row.created_at},${JSON.stringify(row.action ?? row.event_type ?? "")}`)),
      ...(payload.reports.map((row: any) => `report,${row.id},${row.created_at},${JSON.stringify(row.reason ?? row.status ?? "")}`)),
      ...(payload.webhookEvents.map((row: any) => `webhook,${row.id},${row.received_at},${JSON.stringify(row.event_type ?? "")}`))
    ].join("\n");
  } else {
    body = JSON.stringify(payload, null, 2);
  }

  let downloadPath = `exports/audit/${input.requestId}.${extension}`;

  if (hasR2()) {
    await uploadBufferToR2({
      key: downloadPath,
      body: Buffer.from(body),
      contentType: input.format === "csv" ? "text/csv" : "application/json"
    });
  }

  await admin
    .from("audit_export_requests")
    .update({
      status: "completed",
      download_path: downloadPath,
      completed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + env.auditExportRetentionDays * 24 * 60 * 60 * 1000).toISOString()
    })
    .eq("id", input.requestId);

  return { downloadPath };
}
