import { createAdminSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

type PushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
};

export function hasExpoPush() {
  return Boolean(env.expoProjectId);
}

export async function registerExpoPushDevice(input: {
  userId: string;
  expoPushToken: string;
  platform?: string;
  deviceName?: string;
  appBuild?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mobile_push_devices")
    .upsert(
      {
        user_id: input.userId,
        expo_push_token: input.expoPushToken,
        platform: input.platform ?? "unknown",
        device_name: input.deviceName ?? null,
        app_build: input.appBuild ?? null,
        metadata: input.metadata ?? {},
        push_enabled: true,
        is_active: true,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      { onConflict: "expo_push_token" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listUserPushDevices(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mobile_push_devices")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("push_enabled", true)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function sendPushToUser(input: {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const devices = await listUserPushDevices(input.userId);

  if (devices.length === 0) {
    return { sent: 0, tickets: [] as any[] };
  }

  const messages: PushMessage[] = devices.map((device: any) => ({
    to: String(device.expo_push_token),
    title: input.title,
    body: input.body,
    data: input.data ?? {},
    sound: "default"
  }));

  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(env.expoAccessToken ? { Authorization: `Bearer ${env.expoAccessToken}` } : {})
    },
    body: JSON.stringify(messages)
  });

  const payload = await response.json().catch(() => ({}));
  const tickets = Array.isArray((payload as any).data) ? (payload as any).data : [];
  const admin = createAdminSupabaseClient();

  for (let index = 0; index < devices.length; index += 1) {
    const device = devices[index];
    const ticket = tickets[index] ?? null;

    await admin.from("push_notification_deliveries").insert({
      user_id: input.userId,
      device_id: device.id,
      provider: "expo",
      title: input.title,
      body: input.body,
      payload: input.data ?? {},
      status: ticket?.status ?? (response.ok ? "accepted" : "failed"),
      provider_ticket_id: ticket?.id ?? null,
      provider_response: ticket ?? payload,
      sent_at: new Date().toISOString()
    });
  }

  return {
    sent: devices.length,
    tickets
  };
}


const EXPO_PUSH_RECEIPT_URL = "https://exp.host/--/api/v2/push/getReceipts";

export async function pollExpoPushReceipts(input?: { ticketIds?: string[] }) {
  const admin = createAdminSupabaseClient();
  let ticketIds = input?.ticketIds?.filter(Boolean) ?? [];

  if (ticketIds.length === 0) {
    const pending = await admin
      .from("push_notification_deliveries")
      .select("id, provider_ticket_id")
      .eq("provider", "expo")
      .in("status", ["ok", "accepted", "sent", "queued"])
      .not("provider_ticket_id", "is", null)
      .limit(100);

    if (pending.error) throw pending.error;
    ticketIds = (pending.data ?? []).map((item: any) => String(item.provider_ticket_id)).filter(Boolean);
  }

  if (ticketIds.length === 0) {
    return { checked: 0, receipts: {} as Record<string, unknown> };
  }

  const response = await fetch(EXPO_PUSH_RECEIPT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(env.expoAccessToken ? { Authorization: `Bearer ${env.expoAccessToken}` } : {})
    },
    body: JSON.stringify({ ids: ticketIds })
  });

  const payload = await response.json().catch(() => ({} as any));
  const receipts = typeof payload === "object" && payload && typeof payload.data === "object" && payload.data ? payload.data as Record<string, any> : {};

  for (const [ticketId, receipt] of Object.entries(receipts)) {
    await admin
      .from("push_notification_deliveries")
      .update({
        receipt_status: String((receipt as any)?.status ?? "unknown"),
        receipt_checked_at: new Date().toISOString(),
        receipt_details: receipt ?? {}
      })
      .eq("provider_ticket_id", ticketId);
  }

  return {
    checked: ticketIds.length,
    receipts
  };
}
