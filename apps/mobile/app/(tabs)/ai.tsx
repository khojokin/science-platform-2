import { useAuth } from "@clerk/expo";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Card, CardTitle, Muted, Screen } from "@/components/screen";
import { apiFetch } from "@/lib/api";

export default function AiScreen() {
  const { getToken } = useAuth();
  const [prompt, setPrompt] = useState("Explain CRISPR to a first-year biology student.");
  const [answer, setAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function ask() {
    setIsLoading(true);
    try {
      const token = await getToken();
      const result = await apiFetch<{ answer: string; contextUsed: boolean }>("/api/mobile/ai", {
        method: "POST",
        token,
        body: { prompt }
      });
      setAnswer(result.answer);
    } catch (error) {
      Alert.alert("AI request failed", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Screen title="AI copilot" subtitle="Ask for summaries, revision plans, and practice questions.">
      <Card>
        <CardTitle>Prompt</CardTitle>
        <TextInput style={[styles.input, styles.textarea]} multiline value={prompt} onChangeText={setPrompt} />
        <Pressable style={styles.button} onPress={() => void ask()}>
          <Text style={styles.buttonText}>{isLoading ? "Thinking..." : "Ask AI"}</Text>
        </Pressable>
      </Card>

      {answer ? (
        <Card>
          <CardTitle>Answer</CardTitle>
          <Text>{answer}</Text>
          <Muted>Responses come from the same platform copilot route as the web app.</Muted>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  textarea: {
    minHeight: 140,
    textAlignVertical: "top"
  },
  button: {
    backgroundColor: "#0f172a",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "700"
  }
});
