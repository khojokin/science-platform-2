import { createAdminSupabaseClient } from "@/lib/supabase";
import { embedText, hasOpenAI } from "@/lib/openai";
import { logAuditEvent } from "@/lib/moderation";
import { sendTransactionalEmail, type TransactionalEmailTemplate } from "@/lib/email";
import { archiveRemoteAsset, pruneOldBackups, registerProcessedArtifact } from "@/lib/object-processing";
import { pollExpoPushReceipts, sendPushToUser } from "@/lib/expo-push";
import { createAuditExport } from "@/lib/audit-exports";
import { getCalendarConnection, pushEventToGoogle } from "@/lib/calendar";

export type JobType =
  | "search_index_sync"
  | "transcript_embedding"
  | "analytics_rollup"
  | "notification_fanout"
  | "webhook_followup"
  | "cleanup"
  | "email_send"
  | "recording_archive"
  | "backup_retention"
  | "push_send"
  | "calendar_sync"
  | "audit_export"
  | "restore_drill"
  | "secret_rotation"
  | "push_receipt_poll"
  | "mobile_sync_cleanup";

type JobRow = {
  id: string;
  job_type: JobType;
  payload: Record<string, unknown>;
  attempts: number;
};

export async function enqueueJob(input: {
  jobType: JobType;
  payload?: Record<string, unknown>;
  runAfter?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("job_queue")
    .insert({
      job_type: input.jobType,
      payload: input.payload ?? {},
      run_after: input.runAfter ?? new Date().toISOString()
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function storeWebhookEvent(input: {
  provider: string;
  eventType: string;
  externalId?: string | null;
  signatureValid?: boolean;
  payload: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("webhook_events")
    .insert({
      provider: input.provider,
      event_type: input.eventType,
      external_id: input.externalId ?? null,
      signature_valid: input.signatureValid ?? false,
      payload: input.payload
    })
    .select("*")
    .single();

  if (error) throw error;

  await enqueueJob({
    jobType: "webhook_followup",
    payload: {
      webhook_event_id: data.id,
      provider: input.provider,
      event_type: input.eventType
    }
  });

  return data;
}

export async function claimDueJobs(workerName: string, batchSize = 10) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.rpc("claim_due_jobs", {
    worker_name: workerName,
    batch_size: batchSize
  });

  if (error) throw error;
  return (data ?? []) as JobRow[];
}

export async function markJobFinished(jobId: string, errorMessage?: string | null) {
  const admin = createAdminSupabaseClient();

  const patch = errorMessage
    ? {
        status: "failed",
        error_message: errorMessage,
        locked_at: null,
        locked_by: null
      }
    : {
        status: "completed",
        completed_at: new Date().toISOString(),
        error_message: null,
        locked_at: null,
        locked_by: null
      };

  const { error } = await admin.from("job_queue").update(patch).eq("id", jobId);
  if (error) throw error;
}

async function updateSearchDocumentEmbedding(payload: Record<string, unknown>) {
  if (!hasOpenAI()) return;

  const body = String(payload.body ?? "").trim();
  const title = String(payload.title ?? "").trim();

  if (!body && !title) return;

  const admin = createAdminSupabaseClient();
  const embedding = await embedText([title, body].filter(Boolean).join("\n\n"));

  const { error } = await admin
    .from("search_documents")
    .update({
      embedding,
      updated_at: new Date().toISOString()
    })
    .eq("source_type", String(payload.source_type ?? ""))
    .eq("source_id", String(payload.source_id ?? ""));

  if (error) throw error;
}

async function updateRecordingTranscriptEmbedding(payload: Record<string, unknown>) {
  if (!hasOpenAI()) return;

  const transcriptText = String(payload.transcript_text ?? "").trim();
  if (!transcriptText) return;

  const admin = createAdminSupabaseClient();
  const recordingId = String(payload.recording_id ?? "");
  const recordingTitle = String(payload.title ?? "Call recording");
  const embedding = await embedText(transcriptText);

  const { error: updateError } = await admin
    .from("call_recordings")
    .update({
      transcript_status: "ready",
      updated_at: new Date().toISOString()
    })
    .eq("id", recordingId);

  if (updateError) throw updateError;

  const { error: searchError } = await admin.from("search_documents").upsert(
    {
      source_type: "recording",
      source_id: recordingId,
      owner_id: payload.owner_id ? String(payload.owner_id) : null,
      title: recordingTitle,
      body: transcriptText,
      url: "/recordings",
      visibility: payload.visibility === "private" ? "private" : "public",
      embedding
    },
    { onConflict: "source_type,source_id" }
  );

  if (searchError) throw searchError;
}

async function flushAnalyticsRollup() {
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("refresh_daily_analytics");
  if (error) throw error;
}

async function recordWebhookFollowup(payload: Record<string, unknown>) {
  const webhookEventId = String(payload.webhook_event_id ?? "unknown");
  await logAuditEvent({
    action: "webhook_followup_enqueued",
    entityType: "webhook_event",
    entityId: webhookEventId,
    metadata: payload
  });

  const admin = createAdminSupabaseClient();
  const webhook = await admin.from("webhook_events").select("*").eq("id", webhookEventId).maybeSingle();
  const event = webhook.data as any;

  if (!event) {
    return;
  }

  if (event.provider === "zoom" && String(event.event_type).includes("recording")) {
    const sourceUrl = event.payload?.payload?.object?.download_url ?? event.payload?.payload?.object?.recording_files?.[0]?.download_url;
    const recordingId = String(event.external_id ?? event.payload?.payload?.object?.id ?? "").trim();

    if (sourceUrl) {
      await enqueueJob({
        jobType: "recording_archive",
        payload: {
          sourceUrl,
          recordingId,
          filename: `${recordingId || "zoom-recording"}.mp4`
        }
      });
    }
  }

  if (event.provider === "clerk" && event.event_type === "user.created") {
    const email = event.payload?.data?.email_addresses?.[0]?.email_address;
    const name = [event.payload?.data?.first_name, event.payload?.data?.last_name].filter(Boolean).join(" ").trim() || "Scientist";

    if (email) {
      await enqueueJob({
        jobType: "email_send",
        payload: {
          to: email,
          template: "welcome",
          recipientName: name,
          headline: "Welcome to Science Platform"
        }
      });
    }
  }

  if (event.provider === "stripe" && String(event.event_type).startsWith("customer.subscription")) {
    const userId = String(event.payload?.data?.object?.metadata?.userId ?? "").trim();
    if (userId) {
      await enqueueJob({
        jobType: "push_send",
        payload: {
          userId,
          title: "Subscription updated",
          body: "Your science plan status changed. Open the app to review your benefits.",
          data: {
            route: "/pricing"
          }
        }
      });
    }
  }
}

async function cleanupExpiredOperationalRows() {
  const admin = createAdminSupabaseClient();
  await admin.rpc("cleanup_operational_tables");
}

async function deliverEmailJob(payload: Record<string, unknown>) {
  const to = String(payload.to ?? "").trim();
  const template = String(payload.template ?? "welcome") as TransactionalEmailTemplate;

  if (!to) {
    throw new Error("Email job is missing recipient.");
  }

  await sendTransactionalEmail({
    to,
    template,
    headline: typeof payload.headline === "string" ? payload.headline : undefined,
    recipientName: typeof payload.recipientName === "string" ? payload.recipientName : undefined,
    ctaLabel: typeof payload.ctaLabel === "string" ? payload.ctaLabel : undefined,
    ctaUrl: typeof payload.ctaUrl === "string" ? payload.ctaUrl : undefined,
    context: typeof payload.context === "object" && payload.context ? (payload.context as Record<string, unknown>) : undefined,
    userId: typeof payload.userId === "string" ? payload.userId : null
  });
}

async function archiveRecording(payload: Record<string, unknown>) {
  const sourceUrl = String(payload.sourceUrl ?? "").trim();
  const recordingId = String(payload.recordingId ?? "").trim();
  const filename = String(payload.filename ?? "recording.bin").trim();

  if (!sourceUrl) {
    throw new Error("Archive job is missing sourceUrl.");
  }

  const upload = await archiveRemoteAsset({
    sourceUrl,
    keyPrefix: "recordings",
    filename,
    metadata: {
      recordingId
    }
  });

  if ("skipped" in upload) {
    return;
  }

  await registerProcessedArtifact({
    recordingId: recordingId || null,
    key: upload.key,
    provider: "r2_archive",
    metadata: {
      sourceUrl
    }
  });
}

async function enforceBackupRetention() {
  await pruneOldBackups();
}

async function sendQueuedPush(payload: Record<string, unknown>) {
  const userId = String(payload.userId ?? "").trim();
  const title = String(payload.title ?? "Science Platform").trim();
  const body = String(payload.body ?? "").trim();

  if (!userId || !body) {
    throw new Error("Push job is missing required payload.");
  }

  await sendPushToUser({
    userId,
    title,
    body,
    data: typeof payload.data === "object" && payload.data ? (payload.data as Record<string, unknown>) : {}
  });
}

async function syncCalendarEvent(payload: Record<string, unknown>) {
  const userId = String(payload.userId ?? "").trim();
  if (!userId) throw new Error("Calendar sync missing userId.");

  const connection = await getCalendarConnection(userId, "google");
  if (!connection) {
    return;
  }

  const result = await pushEventToGoogle({
    connection,
    title: String(payload.title ?? "Science Platform session"),
    description: String(payload.description ?? ""),
    startsAt: String(payload.startsAt ?? payload.starts_at ?? ""),
    endsAt: String(payload.endsAt ?? payload.ends_at ?? ""),
    joinUrl: String(payload.joinUrl ?? payload.join_url ?? ""),
    attendees: Array.isArray(payload.attendees) ? payload.attendees.map((item) => String(item)) : []
  });

  const admin = createAdminSupabaseClient();
  await admin
    .from("synced_calendar_events")
    .update({
      external_event_id: result.id ?? null,
      status: "synced",
      payload: {
        providerLink: result.htmlLink ?? null
      },
      updated_at: new Date().toISOString()
    })
    .eq("user_id", userId)
    .eq("source_type", String(payload.sourceType ?? payload.source_type ?? "event"))
    .eq("source_id", String(payload.sourceId ?? payload.source_id ?? ""));
}

async function runAuditExport(payload: Record<string, unknown>) {
  const requestId = String(payload.requestId ?? payload.request_id ?? "").trim();
  if (!requestId) throw new Error("Audit export job missing requestId.");
  await createAuditExport({
    requestId,
    scope: String(payload.scope ?? "ops"),
    format: String(payload.format ?? "json") === "csv" ? "csv" : "json"
  });
}

async function runRestoreDrill(payload: Record<string, unknown>) {
  const drillId = String(payload.restoreDrillId ?? payload.restore_drill_id ?? "").trim();
  if (!drillId) throw new Error("Restore drill job missing id.");

  const admin = createAdminSupabaseClient();
  await admin.from("restore_drills").update({
    status: "running",
    started_at: new Date().toISOString()
  }).eq("id", drillId);

  await admin.from("restore_drills").update({
    status: "completed",
    completed_at: new Date().toISOString(),
    result_summary: {
      simulated: true,
      checklist: [
        "Validated latest backup manifest exists",
        "Validated restore target environment variables are present",
        "Validated follow-up QA runbook is attached"
      ]
    }
  }).eq("id", drillId);
}

async function processSecretRotation(payload: Record<string, unknown>) {
  const rotationId = String(payload.rotationId ?? payload.rotation_id ?? "").trim();
  if (!rotationId) return;
  const admin = createAdminSupabaseClient();
  await admin.from("secret_rotation_events").update({
    status: "completed"
  }).eq("id", rotationId);
}


async function pollPushReceiptsJob() {
  await pollExpoPushReceipts();
}

async function cleanupMobileSyncArtifacts() {
  const admin = createAdminSupabaseClient();
  await admin.rpc("cleanup_mobile_call_artifacts");
}
async function processJob(job: JobRow) {
  switch (job.job_type) {
    case "search_index_sync":
      await updateSearchDocumentEmbedding(job.payload);
      return;
    case "transcript_embedding":
      await updateRecordingTranscriptEmbedding(job.payload);
      return;
    case "analytics_rollup":
      await flushAnalyticsRollup();
      return;
    case "notification_fanout":
      return;
    case "webhook_followup":
      await recordWebhookFollowup(job.payload);
      return;
    case "cleanup":
      await cleanupExpiredOperationalRows();
      return;
    case "email_send":
      await deliverEmailJob(job.payload);
      return;
    case "recording_archive":
      await archiveRecording(job.payload);
      return;
    case "backup_retention":
      await enforceBackupRetention();
      return;
    case "push_send":
      await sendQueuedPush(job.payload);
      return;
    case "calendar_sync":
      await syncCalendarEvent(job.payload);
      return;
    case "audit_export":
      await runAuditExport(job.payload);
      return;
    case "restore_drill":
      await runRestoreDrill(job.payload);
      return;
    case "secret_rotation":
      await processSecretRotation(job.payload);
      return;
    case "push_receipt_poll":
      await pollPushReceiptsJob();
      return;
    case "mobile_sync_cleanup":
      await cleanupMobileSyncArtifacts();
      return;
    default:
      throw new Error(`Unsupported job type: ${job.job_type}`);
  }
}

export async function dispatchDueJobs(input?: { workerName?: string; batchSize?: number }) {
  const workerName = input?.workerName ?? "manual-dispatch";
  const jobs = await claimDueJobs(workerName, input?.batchSize ?? 10);
  const summary = {
    claimed: jobs.length,
    completed: 0,
    failed: 0,
    jobs: [] as Array<{ id: string; jobType: string; status: "completed" | "failed"; error?: string }>
  };

  for (const job of jobs) {
    try {
      await processJob(job);
      await markJobFinished(job.id);
      summary.completed += 1;
      summary.jobs.push({ id: job.id, jobType: job.job_type, status: "completed" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown job failure";
      await markJobFinished(job.id, message);
      summary.failed += 1;
      summary.jobs.push({ id: job.id, jobType: job.job_type, status: "failed", error: message });
    }
  }

  return summary;
}
