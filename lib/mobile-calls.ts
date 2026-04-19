
import { createAdminSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

export function getRtcIceServers() {
  const servers: Array<Record<string, unknown>> = env.webrtcStunUrls
    .filter(Boolean)
    .map((url) => ({ urls: url }));

  if (env.webrtcTurnUrl) {
    servers.push({
      urls: env.webrtcTurnUrl,
      username: env.webrtcTurnUsername || undefined,
      credential: env.webrtcTurnCredential || undefined
    });
  }

  return servers;
}

export async function touchMobileCallParticipant(input: {
  roomId: string;
  userId: string;
  displayName: string;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  state?: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mobile_call_participants")
    .upsert(
      {
        room_id: input.roomId,
        user_id: input.userId,
        display_name: input.displayName || "Scientist",
        is_audio_enabled: input.audioEnabled ?? true,
        is_video_enabled: input.videoEnabled ?? true,
        connection_state: input.state ?? "active",
        last_seen_at: new Date().toISOString(),
        left_at: null
      },
      { onConflict: "room_id,user_id" }
    )
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function leaveMobileCallRoom(roomId: string, userId: string) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("mobile_call_participants")
    .update({
      connection_state: "left",
      left_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString()
    })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function listMobileCallParticipants(roomId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mobile_call_participants")
    .select("id, room_id, user_id, display_name, is_audio_enabled, is_video_enabled, connection_state, last_seen_at, joined_at")
    .eq("room_id", roomId)
    .is("left_at", null)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listMobileSignals(roomId: string, userId: string, after?: string | null) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("mobile_call_signals")
    .select("id, sender_user_id, recipient_user_id, signal_type, payload, created_at")
    .eq("room_id", roomId)
    .or(`recipient_user_id.is.null,recipient_user_id.eq.${userId},sender_user_id.eq.${userId}`)
    .order("created_at", { ascending: true })
    .limit(100);

  if (after) {
    query = query.gt("created_at", after);
  }

  const { data, error } = await query;
  if (error) throw error;

  const unseen = (data ?? []).filter((item: any) => item.sender_user_id !== userId);
  if (unseen.length > 0) {
    await admin
      .from("mobile_call_signals")
      .update({ delivered_at: new Date().toISOString() })
      .in("id", unseen.map((item: any) => item.id));
  }

  return data ?? [];
}

export async function createMobileSignal(input: {
  roomId: string;
  senderUserId: string;
  recipientUserId?: string | null;
  signalType: string;
  payload: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("mobile_call_signals")
    .insert({
      room_id: input.roomId,
      sender_user_id: input.senderUserId,
      recipient_user_id: input.recipientUserId ?? null,
      signal_type: input.signalType,
      payload: input.payload
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
