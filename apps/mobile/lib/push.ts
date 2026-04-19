
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { apiFetch } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true
  })
});

export async function registerForPushNotificationsAsync(token: string | null) {
  if (!Device.isDevice) {
    throw new Error("Push notifications require a physical device.");
  }

  const permission = await Notifications.getPermissionsAsync();
  let finalStatus = permission.status;

  if (finalStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== "granted") {
    throw new Error("Push notification permission was not granted.");
  }

  const projectId =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId;

  const pushToken = await Notifications.getExpoPushTokenAsync({ projectId });
  const deviceName = Device.deviceName ?? "Unknown device";

  await apiFetch("/api/mobile/push/register", {
    method: "POST",
    token,
    body: {
      expoPushToken: pushToken.data,
      platform: Device.osName ?? "unknown",
      deviceName,
      appBuild: Constants.expoConfig?.version ?? "dev",
      metadata: {
        osVersion: Device.osVersion ?? null
      }
    }
  });

  return pushToken.data;
}

export async function pollPushReceipts(token: string | null) {
  return apiFetch<{ deliveries: Array<Record<string, unknown>> }>("/api/mobile/push/receipts", {
    token
  });
}
