
import { PropsWithChildren } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

type ScreenProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}>;

export function Screen({ title, subtitle, eyebrow, children, onRefresh, refreshing = false }: ScreenProps) {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#7dd3fc" /> : undefined}
    >
      <LinearGradient colors={["#0f172a", "#111827", "#0f766e"]} style={styles.hero}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </LinearGradient>
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return <View style={styles.card}>{children}</View>;
}

export function CardTitle({ children }: PropsWithChildren) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function Muted({ children }: PropsWithChildren) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Pill({ children }: PropsWithChildren) {
  return <Text style={styles.pill}>{children}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#020617"
  },
  content: {
    padding: 18,
    gap: 16,
    paddingBottom: 32
  },
  hero: {
    padding: 18,
    borderRadius: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.18)"
  },
  eyebrow: {
    color: "#7dd3fc",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#f8fafc"
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: "#cbd5e1"
  },
  card: {
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    borderRadius: 22,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)"
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#f8fafc"
  },
  muted: {
    color: "#94a3b8",
    fontSize: 14,
    lineHeight: 20
  },
  pill: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.24)",
    color: "#7dd3fc",
    backgroundColor: "rgba(125,211,252,0.08)",
    borderRadius: 999,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 12,
    fontWeight: "700"
  }
});
