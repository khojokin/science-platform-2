
import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

export default function IndexScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#020617" }}>
        <ActivityIndicator color="#7dd3fc" />
      </View>
    );
  }

  if (!isSignedIn && process.env.EXPO_PUBLIC_DEMO_MODE === "true") {
    return <Redirect href="/demo" />;
  }

  return <Redirect href={isSignedIn ? "/(tabs)/feed" : "/sign-in"} />;
}
