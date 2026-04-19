
import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Card, CardTitle, Muted, Pill, Screen } from "@/components/screen";

const cards = [
  {
    title: "Science feed",
    summary: "Communities, posts, and AI study prompts designed for STEM learners.",
    bullets: ["Subject communities", "Direct messaging", "Premium tools"]
  },
  {
    title: "Workspaces",
    summary: "Institution and lab spaces for projects, notebooks, and events.",
    bullets: ["Organizations", "Role-based access", "Analytics"]
  },
  {
    title: "Live sessions",
    summary: "Voice, video, Zoom, and mobile-native call scaffolding.",
    bullets: ["Study rooms", "Calendar sync", "Recordings"]
  }
];

export default function DemoScreen() {
  return (
    <Screen title="Demo mode" subtitle="Preview the product story from mobile without signing in." eyebrow="Investor and demo">
      {cards.map((card) => (
        <Card key={card.title}>
          <Pill>Showcase</Pill>
          <CardTitle>{card.title}</CardTitle>
          <Muted>{card.summary}</Muted>
          <View style={{ gap: 8 }}>
            {card.bullets.map((bullet) => (
              <Text key={bullet} style={styles.bullet}>• {bullet}</Text>
            ))}
          </View>
        </Card>
      ))}

      <Link href="/sign-in" asChild>
        <Pressable style={styles.primaryButton}>
          <Text style={styles.primaryText}>Sign in</Text>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bullet: {
    color: "#e2e8f0"
  },
  primaryButton: {
    backgroundColor: "#0891b2",
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: "center"
  },
  primaryText: {
    color: "white",
    fontWeight: "800"
  }
});
