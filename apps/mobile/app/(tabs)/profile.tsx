import { useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { Card, CardTitle, Muted, Screen } from "@/components/screen";
import { useAuthedQuery } from "@/hooks/use-authed-query";

type MeResponse = {
  profile: {
    display_name: string;
    handle: string | null;
    role: string | null;
  };
  subscription: {
    tier: string;
    status: string;
  };
  wallet: {
    balance_credits: number;
  };
  unreadNotifications: number;
};

type NotificationsResponse = {
  notifications: Array<{
    id: string;
    title: string;
    body: string;
    is_read: boolean;
  }>;
};

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const profile = useAuthedQuery<MeResponse>("/api/mobile/me");
  const notifications = useAuthedQuery<NotificationsResponse>("/api/mobile/notifications");

  return (
    <Screen title="Profile" subtitle="Your plan, credits, and active alerts." onRefresh={profile.refresh} refreshing={profile.isLoading}>
      <Card>
        <CardTitle>{profile.data?.profile.display_name ?? "Scientist"}</CardTitle>
        <Muted>@{profile.data?.profile.handle ?? "pending"}</Muted>
        <Muted>{profile.data?.profile.role ?? "student"}</Muted>
      </Card>

      <Card>
        <CardTitle>Subscription</CardTitle>
        <Muted>{profile.data?.subscription.tier ?? "free"} · {profile.data?.subscription.status ?? "inactive"}</Muted>
        <Muted>Credits: {profile.data?.wallet.balance_credits ?? 0}</Muted>
        <Muted>Unread notifications: {profile.data?.unreadNotifications ?? 0}</Muted>
      </Card>

      <Card>
        <CardTitle>Latest notifications</CardTitle>
        {(notifications.data?.notifications ?? []).slice(0, 5).map((notification) => (
          <Text key={notification.id}>
            • {notification.title || "Update"}{notification.is_read ? "" : " (new)"}
          </Text>
        ))}
      </Card>

      <Card>
        <CardTitle>Mobile tools</CardTitle>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/alerts")}>
          <Text style={styles.secondaryText}>Open alerts</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/calls")}>
          <Text style={styles.secondaryText}>Open calls</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => router.push("/calendar")}>
          <Text style={styles.secondaryText}>Open calendar</Text>
        </Pressable>
      </Card>

      <Pressable style={styles.button} onPress={() => void signOut()}>
        <Text style={styles.buttonText}>Sign out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#fee2e2",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  buttonText: {
    color: "#991b1b",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10
  },
  secondaryText: {
    color: "#0f172a",
    fontWeight: "700"
  }
});
