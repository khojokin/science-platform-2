"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { dispatchDueJobs, enqueueJob } from "@/lib/background-jobs";
import { isAdminUser, requireUserId } from "@/lib/auth";

async function requireAdmin() {
  const userId = await requireUserId();
  if (!isAdminUser(userId)) {
    throw new Error("Admin access required.");
  }
  return userId;
}

export async function dispatchJobsNowAction() {
  const userId = await requireAdmin();
  await dispatchDueJobs({ workerName: `admin:${userId}`, batchSize: 20 });
  revalidatePath("/ops");
}

export async function enqueueMaintenanceJobAction() {
  await requireAdmin();
  await enqueueJob({ jobType: "cleanup" });
  revalidatePath("/ops");
}

export async function enqueueAnalyticsRollupAction() {
  await requireAdmin();
  await enqueueJob({ jobType: "analytics_rollup" });
  revalidatePath("/ops");
}

export async function enqueueBackupRetentionAction() {
  await requireAdmin();
  await enqueueJob({ jobType: "backup_retention" });
  revalidatePath("/ops");
}

export async function enqueueTestEmailAction() {
  const userId = await requireAdmin();
  const admin = createAdminSupabaseClient();
  const profile = await admin
    .from("profiles")
    .select("display_name")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  await enqueueJob({
    jobType: "email_send",
    payload: {
      to: process.env.SUPPORT_EMAIL ?? "support@example.com",
      template: "backup_completed",
      headline: "Queued test email",
      recipientName: profile.data?.display_name ?? "Admin",
      userId,
      context: {
        summary: "This is a delivery test from the operations console."
      },
      ctaLabel: "Open ops",
      ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/ops`
    }
  });

  revalidatePath("/ops");
}

export async function setFeatureFlagAction(formData: FormData) {
  const userId = await requireAdmin();
  const key = String(formData.get("key") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "false") === "true";
  const description = String(formData.get("description") ?? "").trim();

  if (!key) {
    throw new Error("Feature flag key is required.");
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("feature_flags").upsert(
    {
      key,
      enabled,
      description,
      updated_by: userId
    },
    { onConflict: "key" }
  );

  if (error) throw error;
  revalidatePath("/moderation");
  revalidatePath("/ops");
}

export async function resolveReportAction(formData: FormData) {
  const userId = await requireAdmin();
  const reportId = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "resolved");
  const notes = String(formData.get("notes") ?? "").trim();

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("reports").update({ status }).eq("id", reportId);
  if (error) throw error;

  await admin.from("moderation_actions").insert({
    report_id: reportId,
    moderator_id: userId,
    action: status,
    notes
  });

  revalidatePath("/moderation");
  revalidatePath("/admin");
}

export async function goToOpsAction() {
  await requireAdmin();
  redirect("/ops");
}


export async function enqueuePushReceiptPollAction() {
  await requireAdmin();
  await enqueueJob({ jobType: "push_receipt_poll" });
  revalidatePath("/ops");
}

export async function enqueueMobileCleanupAction() {
  await requireAdmin();
  await enqueueJob({ jobType: "mobile_sync_cleanup" });
  revalidatePath("/ops");
}
