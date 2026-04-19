import crypto from "node:crypto";
import { env } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export function hasGoogleCalendar() {
  return Boolean(env.googleClientId && env.googleClientSecret && env.googleRedirectUri);
}

export function buildGoogleCalendarAuthorizationUrl(state: string) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", env.googleClientId);
  url.searchParams.set("redirect_uri", env.googleRedirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", env.googleCalendarScopes.join(" "));
  url.searchParams.set("state", state);
  return url.toString();
}

export function createCalendarState(userId: string) {
  return `${userId}:${crypto.randomBytes(12).toString("hex")}`;
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      redirect_uri: env.googleRedirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!response.ok) {
    throw new Error("Google token exchange failed.");
  }

  return response.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    token_type?: string;
    id_token?: string;
  }>;
}

export async function fetchGoogleUserInfo(accessToken: string) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    throw new Error("Could not read Google profile.");
  }

  return response.json() as Promise<{ sub?: string; email?: string; name?: string }>;
}

export async function upsertGoogleCalendarConnection(input: {
  userId: string;
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  scope?: string;
  externalAccountId?: string;
  profile?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("calendar_connections")
    .upsert(
      {
        user_id: input.userId,
        provider: "google",
        external_account_id: input.externalAccountId ?? null,
        access_token: input.accessToken,
        refresh_token: input.refreshToken ?? null,
        token_expires_at: input.expiresIn ? new Date(Date.now() + input.expiresIn * 1000).toISOString() : null,
        scope: (input.scope ?? "").split(" ").filter(Boolean),
        metadata: input.profile ?? {},
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,provider" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function refreshGoogleConnection(connection: any) {
  if (!connection.refresh_token) {
    return connection;
  }

  const shouldRefresh =
    !connection.token_expires_at ||
    new Date(connection.token_expires_at).getTime() - Date.now() < 5 * 60 * 1000;

  if (!shouldRefresh) {
    return connection;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.googleClientId,
      client_secret: env.googleClientSecret,
      refresh_token: String(connection.refresh_token),
      grant_type: "refresh_token"
    })
  });

  if (!response.ok) {
    throw new Error("Google token refresh failed.");
  }

  const token = await response.json() as { access_token: string; expires_in?: number };

  return upsertGoogleCalendarConnection({
    userId: String(connection.user_id),
    accessToken: token.access_token,
    refreshToken: String(connection.refresh_token),
    expiresIn: token.expires_in,
    externalAccountId: connection.external_account_id ?? undefined,
    profile: connection.metadata ?? {}
  });
}

export async function getCalendarConnection(userId: string, provider = "google") {
  const admin = createAdminSupabaseClient();
  const result = await admin
    .from("calendar_connections")
    .select("*")
    .eq("user_id", userId)
    .eq("provider", provider)
    .maybeSingle();

  if (result.error) throw result.error;
  return result.data;
}

export async function upsertCalendarEvent(input: {
  userId: string;
  provider?: string;
  sourceType: string;
  sourceId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  joinUrl?: string;
  payload?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const connection = await getCalendarConnection(input.userId, input.provider ?? "google");

  const { data, error } = await admin
    .from("synced_calendar_events")
    .upsert(
      {
        user_id: input.userId,
        connection_id: connection?.id ?? null,
        provider: input.provider ?? "google",
        source_type: input.sourceType,
        source_id: input.sourceId,
        title: input.title,
        starts_at: input.startsAt,
        ends_at: input.endsAt,
        join_url: input.joinUrl ?? null,
        payload: input.payload ?? {},
        status: connection ? "queued" : "needs_connection",
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,provider,source_type,source_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function pushEventToGoogle(input: {
  connection: any;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  joinUrl?: string;
  attendees?: string[];
}) {
  const connection = await refreshGoogleConnection(input.connection);

  const response = await fetch(GOOGLE_EVENTS_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${connection.access_token}`
    },
    body: JSON.stringify({
      summary: input.title,
      description: [input.description ?? "", input.joinUrl ? `Join: ${input.joinUrl}` : ""].filter(Boolean).join("\n\n"),
      start: { dateTime: input.startsAt },
      end: { dateTime: input.endsAt },
      attendees: (input.attendees ?? []).map((email) => ({ email }))
    })
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Google Calendar insert failed. ${body}`);
  }

  return response.json() as Promise<{ id?: string; htmlLink?: string }>;
}
