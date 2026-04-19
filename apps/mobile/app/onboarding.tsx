
import { useAuth } from "@clerk/expo";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Card, CardTitle, Muted, Screen } from "@/components/screen";
import { apiFetch } from "@/lib/api";

export default function MobileOnboardingScreen() {
  const { getToken } = useAuth();
  const [track, setTrack] = useState("student");
  const [goals, setGoals] = useState("exam prep, study accountability");
  const [interests, setInterests] = useState("physics, mathematics");
  const [experience, setExperience] = useState("");

  async function save() {
    try {
      const token = await getToken();
      await apiFetch("/api/mobile/me/onboarding", {
        method: "POST",
        token,
        body: {
          track,
          goals: goals.split(",").map((item) => item.trim()).filter(Boolean),
          interests: interests.split(",").map((item) => item.trim()).filter(Boolean),
          experience
        }
      });
      router.replace("/(tabs)/feed");
    } catch (error) {
      Alert.alert("Could not complete onboarding", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <Screen title="Set up your science profile" subtitle="Tell the app what kind of work you do so your dashboard is relevant on day one." eyebrow="Onboarding">
      <Card>
        <CardTitle>Track</CardTitle>
        <TextInput style={styles.input} value={track} onChangeText={setTrack} />
        <Muted>Try student, researcher, educator, creator, or institution lead.</Muted>
      </Card>
      <Card>
        <CardTitle>Goals</CardTitle>
        <TextInput style={styles.input} value={goals} onChangeText={setGoals} />
      </Card>
      <Card>
        <CardTitle>Interests</CardTitle>
        <TextInput style={styles.input} value={interests} onChangeText={setInterests} />
      </Card>
      <Card>
        <CardTitle>Experience</CardTitle>
        <TextInput style={[styles.input, styles.area]} multiline value={experience} onChangeText={setExperience} />
      </Card>
      <Pressable style={styles.button} onPress={() => void save()}>
        <Text style={styles.buttonText}>Continue</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "#020617",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  area: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  button: {
    backgroundColor: "#0891b2",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "800"
  }
});
