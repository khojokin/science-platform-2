
import { router } from "expo-router";
import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { Card, CardTitle, Muted, Pill, Screen } from "@/components/screen";
import { useCachedAuthedQuery } from "@/hooks/use-cached-authed-query";

type CallsResponse = {
  rooms: Array<{
    id: string;
    title: string;
    description: string | null;
    provider: string;
    media_mode: string;
    scheduled_for: string | null;
    zoom_join_url: string | null;
    slug: string | null;
  }>;
};

export default function CallsScreen() {
  const calls = useCachedAuthedQuery<CallsResponse>("/api/mobile/calls");

  return (
    <Screen title="Calls" subtitle="Join voice, video, or Zoom sessions from mobile." eyebrow="Realtime" onRefresh={calls.refresh} refreshing={calls.isLoading}>

<Card>
  <CardTitle>LiveKit SFU</CardTitle>
  <Muted>Use the scalable call path for larger study sessions, classes, and recordings.</Muted>
  <Pressable style={styles.button} onPress={() => router.push("/live/demo-room")}>
    <Text style={styles.buttonText}>Open LiveKit demo room</Text>
  </Pressable>
</Card>

      {(calls.data?.rooms ?? []).map((room) => (
        <Card key={room.id}>
          <Pill>{room.provider} · {room.media_mode}</Pill>
          <CardTitle>{room.title}</CardTitle>
          {room.description ? <Text style={styles.body}>{room.description}</Text> : null}
          <Muted>{room.scheduled_for ? new Date(room.scheduled_for).toLocaleString() : "Unscheduled"}</Muted>
          {room.zoom_join_url ? (
            <Pressable style={styles.button} onPress={() => void Linking.openURL(room.zoom_join_url!)}>
              <Text style={styles.buttonText}>Open Zoom</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.button} onPress={() => router.push(`/calls/${room.id}`)}>
              <Text style={styles.buttonText}>Open native room</Text>
            </Pressable>
          )}
        </Card>
      ))}

      {(calls.data?.rooms ?? []).length === 0 ? (
        <Card>
          <CardTitle>No call rooms yet</CardTitle>
          <Muted>Create call rooms on web, then join them from mobile here.</Muted>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryText}>Go back</Text>
          </Pressable>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    color: "#e2e8f0"
  },
  button: {
    backgroundColor: "#0891b2",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryText: {
    color: "#e2e8f0",
    fontWeight: "700"
  }
});
