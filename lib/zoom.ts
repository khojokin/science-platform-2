import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function signHs256(payload: Record<string, unknown>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(`${encodedHeader}.${encodedPayload}`).digest("base64");
  const encodedSignature = signature.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

export function hasZoomMeetingSdk() {
  return Boolean(env.zoomMeetingSdkKey && env.zoomMeetingSdkSecret);
}

export function hasZoomVideoSdk() {
  return Boolean(env.zoomVideoSdkKey && env.zoomVideoSdkSecret);
}

export function hasZoomServerToServerOAuth() {
  return Boolean(env.zoomApiAccountId && env.zoomApiClientId && env.zoomApiClientSecret);
}

export function createZoomMeetingSignature(input: {
  meetingNumber: string;
  role?: 0 | 1;
  videoWebRtcMode?: 0 | 1;
}) {
  if (!hasZoomMeetingSdk()) {
    throw new Error("Zoom Meeting SDK credentials are not configured.");
  }

  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;

  return signHs256(
    {
      appKey: env.zoomMeetingSdkKey,
      mn: input.meetingNumber,
      role: input.role ?? 0,
      iat,
      exp,
      tokenExp: exp,
      video_webrtc_mode: input.videoWebRtcMode ?? 1
    },
    env.zoomMeetingSdkSecret
  );
}

export function createZoomVideoToken(input: {
  sessionName: string;
  roleType?: 0 | 1;
  userKey?: string;
  sessionKey?: string;
}) {
  if (!hasZoomVideoSdk()) {
    throw new Error("Zoom Video SDK credentials are not configured.");
  }

  const iat = Math.floor(Date.now() / 1000) - 30;
  const exp = iat + 60 * 60 * 2;

  return signHs256(
    {
      app_key: env.zoomVideoSdkKey,
      role_type: input.roleType ?? 0,
      tpc: input.sessionName.toLowerCase().slice(0, 200),
      version: 1,
      iat,
      exp,
      user_key: input.userKey?.slice(0, 36) ?? undefined,
      session_key: input.sessionKey?.slice(0, 36) ?? undefined,
      video_webrtc_mode: 1,
      audio_webrtc_mode: 1
    },
    env.zoomVideoSdkSecret
  );
}

export async function getZoomServerAccessToken() {
  if (!hasZoomServerToServerOAuth()) {
    throw new Error("Zoom server-to-server OAuth credentials are not configured.");
  }

  const auth = Buffer.from(`${env.zoomApiClientId}:${env.zoomApiClientSecret}`).toString("base64");
  const response = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(env.zoomApiAccountId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`
      },
      cache: "no-store"
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get Zoom access token: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as { access_token: string };
  return payload.access_token;
}

export async function createManagedZoomMeeting(input: {
  topic: string;
  agenda?: string;
  startTime?: string | null;
  durationMinutes?: number;
}) {
  const token = await getZoomServerAccessToken();
  const response = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      topic: input.topic,
      agenda: input.agenda ?? "",
      type: input.startTime ? 2 : 1,
      start_time: input.startTime || undefined,
      duration: input.durationMinutes ?? 60,
      settings: {
        join_before_host: true,
        waiting_room: true
      }
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Failed to create Zoom meeting: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as {
    id: number;
    password?: string;
    join_url?: string;
    start_url?: string;
  };

  return {
    meetingNumber: String(payload.id),
    password: payload.password ?? "",
    joinUrl: payload.join_url ?? "",
    hostUrl: payload.start_url ?? ""
  };
}
