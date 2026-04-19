import { useAuth } from "@clerk/expo";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";
import { Card, CardTitle, Muted, Screen } from "@/components/screen";
import { useAuthedQuery } from "@/hooks/use-authed-query";
import { apiFetch } from "@/lib/api";

type InboxResponse = {
  conversations: Array<{
    id: string;
    title: string;
    type: string;
    latestMessage: {
      body: string;
      created_at: string;
    } | null;
  }>;
};

export default function InboxScreen() {
  const { getToken } = useAuth();
  const query = useAuthedQuery<InboxResponse>("/api/mobile/messages");
  const [conversationId, setConversationId] = useState("");
  const [text, setText] = useState("");

  async function sendMessage() {
    try {
      const token = await getToken();
      await apiFetch("/api/mobile/messages", {
        method: "POST",
        token,
        body: { conversationId, text }
      });
      setText("");
      await query.refresh();
    } catch (error) {
      Alert.alert("Could not send message", error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <Screen title="Inbox" subtitle="Lightweight mobile messaging for active study threads." onRefresh={query.refresh} refreshing={query.isLoading}>
      <Card>
        <CardTitle>Quick reply</CardTitle>
        <TextInput style={styles.input} placeholder="Conversation ID" value={conversationId} onChangeText={setConversationId} />
        <TextInput style={styles.input} placeholder="Reply" value={text} onChangeText={setText} />
        <Pressable style={styles.button} onPress={() => void sendMessage()}>
          <Text style={styles.buttonText}>Send</Text>
        </Pressable>
      </Card>

      {(query.data?.conversations ?? []).map((conversation) => (
        <Card key={conversation.id}>
          <CardTitle>{conversation.title || "Direct conversation"}</CardTitle>
          <Muted>{conversation.type}</Muted>
          <Muted>ID: {conversation.id}</Muted>
          <Text>{conversation.latestMessage?.body ?? "No messages yet."}</Text>
        </Card>
      ))}
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
