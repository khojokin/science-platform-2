
import { useAuth } from "@clerk/expo";
import { Alert, Pressable, StyleSheet, Text } from "react-native";
import { Card, CardTitle, Muted, Pill, Screen } from "@/components/screen";
import { useCachedAuthedQuery } from "@/hooks/use-cached-authed-query";
import { pollPushReceipts, registerForPushNotificationsAsync } from "@/lib/push";

type ReceiptResponse = {
  deliveries: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    receipt_status: string | null;
    created_at: string;
  }>;
};

export default function AlertsScreen() {
  const { getToken } = useAuth();
  const receipts = useCachedAuthedQuery<ReceiptResponse>("/api/mobile/push/receipts");

  async function registerPush() {
    try {
      const token = await getToken();
      const pushToken = await registerForPushNotificationsAsync(token);
      Alert.alert("Push ready", pushToken);
      await receipts.refresh();
    } catch (error) {
      Alert.alert("Could not enable push", error instanceof Error ? error.message : "Unknown error");
    }
  }

  async function refreshReceipts() {
    try {
      const token = await getToken();
      await pollPushReceipts(token);
      await receipts.refresh();
    } catch (error) {
      Alert.alert("Could not refresh receipts", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <Screen title="Alerts" subtitle="Enable push notifications for messages, study sessions, and moderation updates." eyebrow="Notifications" onRefresh={receipts.refresh} refreshing={receipts.isLoading}>
      <Card>
        <CardTitle>Push notifications</CardTitle>
        <Muted>Register this device with Expo Push, then fan out reminders and inbox alerts from the platform.</Muted>
        <Pressable style={styles.button} onPress={() => void registerPush()}>
          <Text style={styles.buttonText}>Enable push notifications</Text>
        </Pressable>
      </Card>

      <Card>
        <CardTitle>Delivery receipts</CardTitle>
        <Muted>Review whether Expo accepted your notifications and whether delivery receipts were recorded.</Muted>
        <Pressable style={styles.secondaryButton} onPress={() => void refreshReceipts()}>
          <Text style={styles.secondaryText}>Refresh receipts</Text>
        </Pressable>
      </Card>

      {(receipts.data?.deliveries ?? []).map((delivery) => (
        <Card key={delivery.id}>
          <Pill>{delivery.receipt_status ?? delivery.status}</Pill>
          <CardTitle>{delivery.title}</CardTitle>
          <Muted>{delivery.body}</Muted>
          <Muted>{new Date(delivery.created_at).toLocaleString()}</Muted>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
