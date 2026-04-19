import { ClerkProvider } from "@clerk/expo";
import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import * as Linking from "expo-linking";
import { useEffect } from "react";
import { tokenCache } from "@/lib/token-cache";
import * as Sentry from "@sentry/react-native";
import { getInternalPathFromUrl } from "@/lib/deep-links";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.2
  });
}

export default function RootLayout() {
  useEffect(() => {
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      const nextPath = getInternalPathFromUrl(url);
      if (nextPath) {
        router.push(nextPath as never);
      }
    });

    const notificationSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = typeof response.notification.request.content.data?.url === "string"
        ? response.notification.request.content.data.url
        : null;
      const nextPath = getInternalPathFromUrl(url);
      if (nextPath) {
        router.push(nextPath as never);
      }
    });

    return () => {
      linkingSubscription.remove();
      notificationSubscription.remove();
    };
  }, []);

  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="demo" />
        <Stack.Screen name="alerts" />
        <Stack.Screen name="calls" />
        <Stack.Screen name="live" />
        <Stack.Screen name="recordings" />
        <Stack.Screen name="calendar" />
      </Stack>
    </ClerkProvider>
  );
}
