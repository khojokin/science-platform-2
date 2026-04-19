import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Science Platform",
  slug: "science-platform",
  scheme: "science-platform",
  version: "1.0.0",
  orientation: "portrait",
  userInterfaceStyle: "automatic",
  plugins: [
    "expo-router",
    [
      "expo-notifications",
      {
        color: "#111827"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  android: {
    package: "com.example.scienceplatform",
    permissions: ["POST_NOTIFICATIONS", "CAMERA", "RECORD_AUDIO"]
  },
  ios: {
    bundleIdentifier: "com.example.scienceplatform",
    infoPlist: {
      NSCameraUsageDescription: "Science Platform uses the camera for study rooms and live science sessions.",
      NSMicrophoneUsageDescription: "Science Platform uses the microphone for voice and video collaboration."
    }
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID
    }
  }
};

export default config;
