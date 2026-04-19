import { useAuth } from "@clerk/expo";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, CardTitle, Muted, Pill, Screen } from "@/components/screen";
import { apiFetch } from "@/lib/api";

type TokenResponse = {
  token: string;
  url: string;
  roomName: string;
  provider: string;
  room: {
    id: string;
    slug: string;
    title: string;
  };
};

export default function MobileLiveKitRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const { getToken } = useAuth();
  const [payload, setPayload] = useState<TokenResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const token = await getToken();
        const data = await apiFetch<TokenResponse>("/api/mobile/livekit/token", {
          method: "POST",
          token,
          body: { room: roomId }
        });

        if (active) {
          setPayload(data);
          setError("");
        }
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "Unable to load LiveKit room.");
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [getToken, roomId]);

  return (
    <Screen
      eyebrow="LiveKit SFU"
      title="Large-room mobile calling"
      subtitle="This screen is the production-grade mobile entrypoint for LiveKit-based rooms."
    >
      <Card>
        <CardTitle>Connection state</CardTitle>
        {error ? <Muted>{error}</Muted> : null}
        {payload ? (
          <View style={styles.stack}>
            <Pill>{payload.provider}</Pill>
            <Text style={styles.title}>{payload.room.title}</Text>
            <Muted>Room name: {payload.roomName}</Muted>
            <Muted>Server URL: {payload.url}</Muted>
            <Muted>Token preview: {payload.token.slice(0, 24)}…</Muted>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Attach @livekit/react-native room UI next</Text>
            </Pressable>
          </View>
        ) : (
          <Muted>Preparing your room token…</Muted>
        )}
      </Card>

      <Card>
        <CardTitle>Why this route exists</CardTitle>
        <Muted>
          The earlier polling WebRTC path is fine for tiny rooms. This screen is the future path for scalable audio/video, recordings, and more reliable reconnect behavior.
        </Muted>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: 10
  },
  title: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "700"
  },
  button: {
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(125, 211, 252, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(125, 211, 252, 0.26)"
  },
  buttonText: {
    color: "#e0f2fe",
    fontWeight: "700"
  }
});
