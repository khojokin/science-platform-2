
import { useAuth } from "@clerk/expo";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { RTCView } from "react-native-webrtc";
import { Card, CardTitle, Muted, Pill, Screen } from "@/components/screen";
import { apiFetch } from "@/lib/api";
import { createMobileCallController } from "@/lib/webrtc";

type SessionResponse = {
  room: {
    id: string;
    title: string;
    provider: string;
    media_mode: string;
  };
  self: {
    userId: string;
    displayName: string;
  };
  participants: Array<{
    user_id: string;
    display_name: string;
    is_audio_enabled: boolean;
    is_video_enabled: boolean;
    connection_state: string;
  }>;
  rtcConfig: {
    iceServers: Array<Record<string, unknown>>;
    audio: boolean;
    video: boolean;
  };
};

type SignalsResponse = {
  signals: Array<{
    id: string;
    sender_user_id: string;
    signal_type: string;
    payload: Record<string, unknown>;
    created_at: string;
  }>;
  participants: Array<{
    user_id: string;
    display_name: string;
    is_audio_enabled: boolean;
    is_video_enabled: boolean;
    connection_state: string;
    last_seen_at: string;
  }>;
};

export default function MobileCallRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { getToken } = useAuth();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [signals, setSignals] = useState<SignalsResponse["participants"]>([]);
  const [loading, setLoading] = useState(true);
  const [connectedPeers, setConnectedPeers] = useState<string[]>([]);
  const lastCursor = useRef<string | null>(null);
  const controller = useRef<ReturnType<typeof createMobileCallController> | null>(null);

  const remoteStreams = useMemo(() => {
    if (!controller.current) return [];
    return Array.from(controller.current.peers.values()).flatMap((peer) => (peer.stream ? [{ userId: peer.userId, stream: peer.stream }] : []));
  }, [connectedPeers]);

  async function sendSignal(message: { recipientUserId?: string | null; signalType: string; payload: Record<string, unknown> }) {
    const token = await getToken();
    await apiFetch(`/api/mobile/calls/${roomId}/signals`, {
      method: "POST",
      token,
      body: message
    });
  }

  async function loadSession() {
    const token = await getToken();
    const nextSession = await apiFetch<SessionResponse>(`/api/mobile/calls/${roomId}/session`, { token });
    setSession(nextSession);
    controller.current = createMobileCallController(nextSession.self.userId);
    await controller.current.initLocalMedia({
      audio: nextSession.rtcConfig.audio,
      video: nextSession.rtcConfig.video
    });

    for (const participant of nextSession.participants) {
      if (participant.user_id === nextSession.self.userId) continue;
      if (nextSession.self.userId < participant.user_id) {
        await controller.current.createOfferFor(participant.user_id, nextSession.rtcConfig.iceServers, sendSignal);
      }
    }

    setLoading(false);
  }

  async function pollSignals() {
    if (!session) return;
    const token = await getToken();
    const response = await apiFetch<SignalsResponse>(`/api/mobile/calls/${roomId}/signals${lastCursor.current ? `?after=${encodeURIComponent(lastCursor.current)}` : ""}`, { token });
    const iceServers = session.rtcConfig.iceServers;

    for (const signal of response.signals) {
      lastCursor.current = signal.created_at;
      await controller.current?.handleSignal(
        {
          senderUserId: signal.sender_user_id,
          signalType: signal.signal_type,
          payload: signal.payload
        },
        iceServers,
        sendSignal
      );
    }

    setSignals(response.participants);
    setConnectedPeers(Array.from(controller.current?.peers.keys() ?? []));
  }

  useEffect(() => {
    void loadSession().catch((error) => {
      Alert.alert("Could not open room", error instanceof Error ? error.message : "Unknown error");
    });

    return () => {
      const tokenPromise = getToken();
      tokenPromise
        .then((token) => apiFetch(`/api/mobile/calls/${roomId}/session`, { method: "DELETE", token }))
        .catch(() => undefined);
      controller.current?.leave();
    };
  }, [roomId]);

  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      void pollSignals().catch(() => undefined);
      void getToken()
        .then((token) => apiFetch(`/api/mobile/calls/${roomId}/session`, { method: "POST", token, body: { state: "active" } }))
        .catch(() => undefined);
    }, 2000);

    return () => clearInterval(interval);
  }, [session, roomId]);

  return (
    <Screen title={session?.room.title ?? "Native call"} subtitle="Small-group audio/video mesh room for mobile." eyebrow="WebRTC">
      <Card>
        <CardTitle>Room status</CardTitle>
        <Muted>{loading ? "Joining..." : `${signals.length} participant(s) visible`}</Muted>
        <Muted>This native mobile room uses simple REST polling for signaling, which is best for small study groups.</Muted>
      </Card>

      <Card>
        <CardTitle>Your camera preview</CardTitle>
        {controller.current?.localStream ? (
          <RTCView style={styles.video} streamURL={controller.current.localStream.toURL()} objectFit="cover" />
        ) : (
          <Muted>Camera and microphone permission needed to preview local media.</Muted>
        )}
      </Card>

      {remoteStreams.map((peer) => (
        <Card key={peer.userId}>
          <CardTitle>Peer: {signals.find((item) => item.user_id === peer.userId)?.display_name ?? peer.userId}</CardTitle>
          <RTCView style={styles.video} streamURL={peer.stream.toURL()} objectFit="cover" />
        </Card>
      ))}

      <Card>
        <CardTitle>Participants</CardTitle>
        <View style={{ gap: 8 }}>
          {signals.map((participant) => (
            <View key={participant.user_id} style={styles.row}>
              <Pill>{participant.connection_state}</Pill>
              <Text style={styles.name}>{participant.display_name}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Pressable style={styles.leaveButton} onPress={() => controller.current?.leave()}>
        <Text style={styles.leaveText}>Leave local media</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  video: {
    width: "100%",
    aspectRatio: 1.3,
    borderRadius: 18,
    backgroundColor: "#0f172a"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  name: {
    color: "#f8fafc",
    fontWeight: "700"
  },
  leaveButton: {
    backgroundColor: "#7f1d1d",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  leaveText: {
    color: "white",
    fontWeight: "800"
  }
});
