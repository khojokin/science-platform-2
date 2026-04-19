import { env } from "@/lib/env";

type LiveKitJoinOptions = {
  roomName: string;
  userId: string;
  displayName: string;
  metadata?: Record<string, unknown>;
  canPublish?: boolean;
  canSubscribe?: boolean;
  roomAdmin?: boolean;
};

type RecordingOutput = {
  bucket?: string;
  filepath: string;
};

export function hasLiveKit() {
  return Boolean(env.livekitServerUrl && env.livekitApiKey && env.livekitApiSecret);
}

export function getLiveKitPublicUrl() {
  return env.livekitUrl || env.livekitServerUrl;
}

export function getCallRoomLivekitName(room: { id: string; slug?: string | null }) {
  return `science-${room.slug || room.id}`;
}

export async function createLiveKitToken(options: LiveKitJoinOptions) {
  if (!hasLiveKit()) {
    throw new Error("LiveKit is not configured.");
  }

  const livekit: any = await import("livekit-server-sdk");
  const token = new livekit.AccessToken(env.livekitApiKey, env.livekitApiSecret, {
    identity: options.userId,
    name: options.displayName,
    metadata: JSON.stringify(options.metadata ?? {})
  });

  token.addGrant({
    room: options.roomName,
    roomJoin: true,
    canPublish: options.canPublish ?? true,
    canSubscribe: options.canSubscribe ?? true,
    roomAdmin: options.roomAdmin ?? false
  });

  return token.toJwt();
}

export async function ensureLiveKitRoom(roomName: string, maxParticipants?: number | null) {
  if (!hasLiveKit()) {
    throw new Error("LiveKit is not configured.");
  }

  const livekit: any = await import("livekit-server-sdk");
  const client = new livekit.RoomServiceClient(env.livekitServerUrl, env.livekitApiKey, env.livekitApiSecret);
  const rooms = await client.listRooms([roomName]);

  if (rooms.length > 0) {
    return rooms[0];
  }

  return client.createRoom({
    name: roomName,
    emptyTimeout: 10 * 60,
    maxParticipants: maxParticipants ?? 0
  });
}

export async function listLiveKitParticipants(roomName: string) {
  if (!hasLiveKit()) {
    return [];
  }

  const livekit: any = await import("livekit-server-sdk");
  const client = new livekit.RoomServiceClient(env.livekitServerUrl, env.livekitApiKey, env.livekitApiSecret);
  return client.listParticipants(roomName);
}

export async function verifyLiveKitWebhook(body: string, authHeader: string | null) {
  if (!hasLiveKit() || !env.livekitWebhookKey || !authHeader) {
    return null;
  }

  const livekit: any = await import("livekit-server-sdk");
  const receiver = new livekit.WebhookReceiver(env.livekitApiKey, env.livekitWebhookKey);
  return receiver.receive(body, authHeader);
}

export function buildRecordingFilepath(roomName: string, extension = "mp4") {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `recordings/${roomName}/${stamp}.${extension}`;
}

export async function startLiveKitRoomRecording(roomName: string, output: RecordingOutput) {
  if (!hasLiveKit()) {
    throw new Error("LiveKit is not configured.");
  }

  const livekit: any = await import("livekit-server-sdk");
  const client = new livekit.EgressClient(env.livekitServerUrl, env.livekitApiKey, env.livekitApiSecret);

  const fileOutput = {
    filepath: output.filepath,
    s3: output.bucket
      ? {
          bucket: output.bucket,
          region: "auto",
          accessKey: process.env.R2_ACCESS_KEY_ID ?? "",
          secret: process.env.R2_SECRET_ACCESS_KEY ?? "",
          endpoint: process.env.R2_ENDPOINT ?? "",
          forcePathStyle: true
        }
      : undefined
  };

  return client.startRoomCompositeEgress(roomName, {
    file: fileOutput,
    preset: "H264_720P_30"
  });
}

export async function stopLiveKitRecording(egressId: string) {
  if (!hasLiveKit()) {
    throw new Error("LiveKit is not configured.");
  }

  const livekit: any = await import("livekit-server-sdk");
  const client = new livekit.EgressClient(env.livekitServerUrl, env.livekitApiKey, env.livekitApiSecret);
  return client.stopEgress(egressId);
}
