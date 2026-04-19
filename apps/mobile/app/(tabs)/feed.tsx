
import { useAuth } from "@clerk/expo";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Card, CardTitle, Muted, Pill, Screen } from "@/components/screen";
import { useCachedAuthedQuery } from "@/hooks/use-cached-authed-query";
import { apiFetch } from "@/lib/api";
import { flushOfflineMutations, queueOfflinePost } from "@/lib/offline-sync";
import { queuedMutationCount } from "@/lib/offline-store";

type FeedResponse = {
  posts: Array<{
    id: string;
    title: string;
    body: string;
    createdAt: string;
    tags: string[];
    commentsCount: number;
    community: { name: string; slug: string } | null;
    author: { display_name: string; handle: string | null } | null;
  }>;
};

type CommunitiesResponse = {
  communities: Array<{ id: string; name: string; slug: string }>;
};

export default function FeedScreen() {
  const { getToken } = useAuth();
  const feed = useCachedAuthedQuery<FeedResponse>("/api/mobile/feed");
  const communities = useCachedAuthedQuery<CommunitiesResponse>("/api/mobile/communities");
  const [communityId, setCommunityId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const queuedCount = queuedMutationCount();

  async function createPost() {
    if (!communityId || !title || !body) {
      Alert.alert("Missing fields", "Add a community, title, and body.");
      return;
    }

    try {
      const token = await getToken();
      await apiFetch("/api/mobile/posts", {
        method: "POST",
        token,
        body: {
          communityId,
          title,
          body
        }
      });
      setTitle("");
      setBody("");
      await feed.refresh();
    } catch (error) {
      queueOfflinePost({
        communityId,
        title,
        body
      });
      setTitle("");
      setBody("");
      Alert.alert("Saved offline", "Your post draft was queued and will sync later.");
    }
  }

  async function flushQueue() {
    try {
      const token = await getToken();
      const count = await flushOfflineMutations(token);
      await feed.refresh();
      Alert.alert("Queue synced", `${count} queued changes synced.`);
    } catch (error) {
      Alert.alert("Still offline", error instanceof Error ? error.message : "Could not sync right now.");
    }
  }

  return (
    <Screen
      title="Science feed"
      subtitle="Stay on top of ideas, questions, and experiments."
      eyebrow="Mobile"
      onRefresh={feed.refresh}
      refreshing={feed.isLoading}
    >
      {feed.isOfflineData ? (
        <Card>
          <Pill>Offline cache</Pill>
          <Muted>You are viewing cached content. Pull to refresh when you are online again.</Muted>
        </Card>
      ) : null}

      {queuedCount > 0 ? (
        <Card>
          <CardTitle>Queued changes</CardTitle>
          <Muted>{queuedCount} offline mutation{queuedCount === 1 ? "" : "s"} waiting to sync.</Muted>
          <Pressable style={styles.secondaryButton} onPress={() => void flushQueue()}>
            <Text style={styles.secondaryText}>Sync queued changes</Text>
          </Pressable>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Quick post</CardTitle>
        <TextInput
          style={styles.input}
          placeholder="Community ID"
          placeholderTextColor="#64748b"
          value={communityId}
          onChangeText={setCommunityId}
        />
        <Muted>
          Demo shortcut: paste a community id from the communities tab. Existing communities: {(communities.data?.communities ?? []).slice(0, 3).map((item) => item.name).join(", ")}
        </Muted>
        <TextInput style={styles.input} placeholder="Title" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
        <TextInput style={[styles.input, styles.textarea]} multiline placeholder="What are you sharing?" placeholderTextColor="#64748b" value={body} onChangeText={setBody} />
        <Pressable style={styles.button} onPress={() => void createPost()}>
          <Text style={styles.buttonText}>Create or queue post</Text>
        </Pressable>
      </Card>

      {feed.error ? <Muted>{feed.error}</Muted> : null}

      {(feed.data?.posts ?? []).map((post) => (
        <Card key={post.id}>
          <Muted>{post.community?.name ?? "Community"} · {new Date(post.createdAt).toLocaleString()}</Muted>
          <CardTitle>{post.title}</CardTitle>
          <Text style={styles.body}>{post.body}</Text>
          <Muted>By {post.author?.display_name ?? "Scientist"} · {post.commentsCount} comments</Muted>
          {post.tags?.length ? (
            <View style={styles.tagsRow}>
              {post.tags.map((tag) => (
                <Pill key={tag}>{tag}</Pill>
              ))}
            </View>
          ) : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: "#020617",
    color: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  textarea: {
    minHeight: 120,
    textAlignVertical: "top"
  },
  button: {
    backgroundColor: "#0891b2",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  buttonText: {
    color: "white",
    fontWeight: "700"
  },
  secondaryButton: {
    backgroundColor: "#1e293b",
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryText: {
    color: "#e2e8f0",
    fontWeight: "700"
  },
  body: {
    color: "#e2e8f0"
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  }
});
