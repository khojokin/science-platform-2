import { useSignIn } from "@clerk/expo";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit() {
    if (!isLoaded) return;

    try {
      const result = await signIn.create({
        identifier,
        password
      });

      if (result.status === "complete") {
        await setActive?.({ session: result.createdSessionId });
        router.replace("/(tabs)/feed");
      }
    } catch (error) {
      Alert.alert("Sign in failed", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Science Platform</Text>
      <Text style={styles.subtitle}>Sign in to your science communities, calls, AI tools, and study spaces.</Text>
      <TextInput style={styles.input} autoCapitalize="none" placeholder="Email or username" value={identifier} onChangeText={setIdentifier} />
      <TextInput style={styles.input} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Pressable style={styles.button} onPress={() => void handleSubmit()}>
        <Text style={styles.buttonText}>Sign in</Text>
      </Pressable>
      {process.env.EXPO_PUBLIC_DEMO_MODE === "true" ? (
        <Link href="/demo" asChild>
          <Pressable style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Demo mode</Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0f172a",
    padding: 24,
    gap: 14
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "white"
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#cbd5e1",
    marginBottom: 8
  },
  input: {
    borderRadius: 14,
    backgroundColor: "white",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  button: {
    backgroundColor: "#38bdf8",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8
  },
  buttonText: {
    color: "#082f49",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  secondaryText: {
    color: "#e2e8f0",
    fontWeight: "700"
  }
});
