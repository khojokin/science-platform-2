import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";

export async function trackAnalyticsEvent(input: {
  eventName: string;
  userId?: string | null;
  sessionKey?: string | null;
  path?: string | null;
  properties?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();

  const { error } = await admin.from("analytics_events").insert({
    event_name: input.eventName,
    user_id: input.userId ?? null,
    session_key: input.sessionKey ?? null,
    path: input.path ?? null,
    properties: input.properties ?? {}
  });

  if (error) throw error;
}

export async function getUserDashboard(userId: string) {
  const client = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  const [posts, comments, groups, workspaces, bounties, events, messages, notifications, recentRollups] = await Promise.all([
    client.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    client.from("comments").select("id", { count: "exact", head: true }).eq("author_id", userId),
    client.from("study_group_members").select("id", { count: "exact", head: true }).eq("user_id", userId),
    client.from("workspace_profiles").select("id", { count: "exact", head: true }).eq("owner_id", userId),
    client.from("question_bounties").select("id", { count: "exact", head: true }).eq("author_id", userId),
    client.from("events").select("id", { count: "exact", head: true }).eq("organizer_id", userId),
    client.from("messages").select("id", { count: "exact", head: true }).eq("author_id", userId),
    client.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", false),
    admin.from("analytics_daily").select("*").order("day", { ascending: false }).limit(14)
  ]);

  return {
    metrics: [
      { label: "Posts", value: posts.count ?? 0 },
      { label: "Comments", value: comments.count ?? 0 },
      { label: "Groups", value: groups.count ?? 0 },
      { label: "Workspaces", value: workspaces.count ?? 0 },
      { label: "Bounties", value: bounties.count ?? 0 },
      { label: "Events", value: events.count ?? 0 },
      { label: "Messages", value: messages.count ?? 0 },
      { label: "Unread alerts", value: notifications.count ?? 0 }
    ],
    analytics: (recentRollups.data ?? []).slice().reverse()
  };
}

export async function getAdminOperationsSnapshot() {
  const admin = createAdminSupabaseClient();
  const [jobs, webhooks, analytics, reports, emailDeliveries, backupManifests, restoreDrills, secretRotations, auditExports] = await Promise.all([
    admin.from("job_queue").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("webhook_events").select("*").order("received_at", { ascending: false }).limit(20),
    admin.from("analytics_daily").select("*").order("day", { ascending: false }).limit(14),
    admin.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("email_deliveries").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("backup_manifests").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("restore_drills").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("secret_rotation_events").select("*").order("created_at", { ascending: false }).limit(20),
    admin.from("audit_export_requests").select("*").order("created_at", { ascending: false }).limit(20)
  ]);

  return {
    jobs: jobs.data ?? [],
    webhooks: webhooks.data ?? [],
    analytics: (analytics.data ?? []).slice().reverse(),
    openReports: reports.count ?? 0,
    emailDeliveries: emailDeliveries.data ?? [],
    backupManifests: backupManifests.data ?? [],
    restoreDrills: restoreDrills.data ?? [],
    secretRotations: secretRotations.data ?? [],
    auditExports: auditExports.data ?? []
  };
}

export async function getModerationSnapshot() {
  const admin = createAdminSupabaseClient();
  const [reports, auditLogs, rateLimitHotspots, flags] = await Promise.all([
    admin
      .from("reports")
      .select("*, reporter:profiles!fk_reports_reporter(display_name, handle)")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: false })
      .limit(25),
    admin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(25),
    admin.from("request_rate_limits").select("action, route, created_at").order("created_at", { ascending: false }).limit(50),
    admin.from("feature_flags").select("*").order("key")
  ]);

  return {
    reports: reports.data ?? [],
    auditLogs: auditLogs.data ?? [],
    rateLimitHotspots: rateLimitHotspots.data ?? [],
    featureFlags: flags.data ?? []
  };
}
