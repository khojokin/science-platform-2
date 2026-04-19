import { Tabs } from "expo-router";
import { AuthGuard } from "@/components/auth-guard";

export default function TabsLayout() {
  return (
    <AuthGuard>
      <Tabs screenOptions={{ headerShown: false }}>
        <Tabs.Screen name="feed" options={{ title: "Feed" }} />
        <Tabs.Screen name="communities" options={{ title: "Communities" }} />
        <Tabs.Screen name="inbox" options={{ title: "Inbox" }} />
        <Tabs.Screen name="ai" options={{ title: "AI" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
    </AuthGuard>
  );
}
