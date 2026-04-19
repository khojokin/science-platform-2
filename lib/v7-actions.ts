"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { buildGoogleCalendarAuthorizationUrl, createCalendarState, hasGoogleCalendar, upsertCalendarEvent } from "@/lib/calendar";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { enqueueJob } from "@/lib/background-jobs";
import { isAdminUser, requireUserId } from "@/lib/auth";
import { logSecretRotation } from "@/lib/secrets";

export async function connectGoogleCalendarAction() {
  const userId = await requireUserId();

  if (!hasGoogleCalendar()) {
    throw new Error("Google Calendar is not configured.");
  }

  const state = createCalendarState(userId);
  const cookieStore = await cookies();
  cookieStore.set("google_calendar_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10
  });

  redirect(buildGoogleCalendarAuthorizationUrl(state));
}

export async function queueCalendarSyncAction(formData: FormData) {
  const userId = await requireUserId();
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("starts_at") ?? "").trim();
  const endsAt = String(formData.get("ends_at") ?? "").trim();
  const joinUrl = String(formData.get("join_url") ?? "").trim();
  const sourceType = String(formData.get("source_type") ?? "custom_event").trim();
  const sourceId = String(formData.get("source_id") ?? crypto.randomUUID()).trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!title || !startsAt || !endsAt) {
    throw new Error("Title, start, and end time are required.");
  }

  await upsertCalendarEvent({
    userId,
    sourceType,
    sourceId,
    title,
    startsAt: new Date(startsAt).toISOString(),
    endsAt: new Date(endsAt).toISOString(),
    joinUrl,
    payload: {
      description
    }
  });

  await enqueueJob({
    jobType: "calendar_sync",
    payload: {
      userId,
      sourceType,
      sourceId,
      title,
      description,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      joinUrl
    }
  });

  revalidatePath("/calendar");
  revalidatePath("/events");
}

export async function requestAuditExportAction(formData: FormData) {
  const userId = await requireUserId();
  if (!isAdminUser(userId)) {
    throw new Error("Admin access required.");
  }

  const format = String(formData.get("format") ?? "json") === "csv" ? "csv" : "json";
  const scope = String(formData.get("scope") ?? "ops").trim();

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("audit_export_requests")
    .insert({
      requested_by: userId,
      format,
      scope,
      status: "queued"
    })
    .select("*")
    .single();

  if (error) throw error;

  await enqueueJob({
    jobType: "audit_export",
    payload: {
      requestId: data.id,
      format,
      scope
    }
  });

  revalidatePath("/ops/security");
  revalidatePath("/ops");
}

export async function runRestoreDrillAction(formData: FormData) {
  const userId = await requireUserId();
  if (!isAdminUser(userId)) {
    throw new Error("Admin access required.");
  }

  const targetEnvironment = String(formData.get("target_environment") ?? "staging-restore").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("restore_drills")
    .insert({
      requested_by: userId,
      target_environment: targetEnvironment,
      notes,
      status: "queued"
    })
    .select("*")
    .single();

  if (error) throw error;

  await enqueueJob({
    jobType: "restore_drill",
    payload: {
      restoreDrillId: data.id
    }
  });

  revalidatePath("/ops/reliability");
  revalidatePath("/ops");
}

export async function logSecretRotationAction(formData: FormData) {
  const userId = await requireUserId();
  if (!isAdminUser(userId)) {
    throw new Error("Admin access required.");
  }

  const provider = String(formData.get("provider") ?? "").trim();
  const secretName = String(formData.get("secret_name") ?? "").trim();
  const previousSecret = String(formData.get("previous_secret") ?? "").trim();
  const nextSecret = String(formData.get("next_secret") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!provider || !secretName) {
    throw new Error("Provider and secret name are required.");
  }

  const logged = await logSecretRotation({
    actorId: userId,
    provider,
    secretName,
    previousSecret,
    nextSecret,
    notes
  });

  await enqueueJob({
    jobType: "secret_rotation",
    payload: {
      rotationId: logged.id
    }
  });

  revalidatePath("/ops/security");
  revalidatePath("/ops");
}
