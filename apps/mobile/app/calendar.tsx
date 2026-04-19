import { Linking, Pressable, StyleSheet, Text } from "react-native";
import { Card, CardTitle, Muted, Screen } from "@/components/screen";
import { useAuthedQuery } from "@/hooks/use-authed-query";

type CalendarResponse = {
  connection: {
    provider: string;
    external_account_id: string | null;
    updated_at: string;
  } | null;
  events: Array<{
    id: string;
    title: string;
    starts_at: string;
    ends_at: string;
    status: string;
    join_url: string | null;
    source_type: string;
  }>;
};

export default function CalendarScreen() {
  const calendar = useAuthedQuery<CalendarResponse>("/api/mobile/calendar");

  return (
    <Screen title="Calendar" subtitle="See synced science sessions and jump into the web calendar console." onRefresh={calendar.refresh} refreshing={calendar.isLoading}>
      <Card>
        <CardTitle>Connection</CardTitle>
        <Muted>
          {calendar.data?.connection ? `Connected to ${calendar.data.connection.provider}` : "No Google Calendar connection yet"}
        </Muted>
        <Pressable style={styles.button} onPress={() => void Linking.openURL(`${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/calendar`)}>
          <Text style={styles.buttonText}>{calendar.data?.connection ? "Open web calendar" : "Connect on web"}</Text>
        </Pressable>
      </Card>

      {(calendar.data?.events ?? []).map((event) => (
        <Card key={event.id}>
          <Muted>{event.source_type} · {event.status}</Muted>
          <CardTitle>{event.title}</CardTitle>
          <Muted>{new Date(event.starts_at).toLocaleString()} → {new Date(event.ends_at).toLocaleString()}</Muted>
          {event.join_url ? (
            <Pressable style={styles.secondaryButton} onPress={() => void Linking.openURL(event.join_url!)}>
              <Text style={styles.secondaryText}>Open join link</Text>
            </Pressable>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryText: {
    color: "#0f172a",
    fontWeight: "700"
  }
});
