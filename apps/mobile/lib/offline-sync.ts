
import { apiFetch } from "@/lib/api";
import { enqueueMutation, listQueuedMutations, markMutationSynced } from "@/lib/offline-store";

export function queueOfflinePost(input: { communityId: string; title: string; body: string; tags?: string[] }) {
  enqueueMutation({
    route: "/api/mobile/posts",
    method: "POST",
    body: input
  });
}

export async function flushOfflineMutations(token: string | null) {
  const queue = listQueuedMutations();
  const syncedEvents: Array<Record<string, unknown>> = [];

  for (const item of queue) {
    try {
      const body = item.body ? JSON.parse(item.body) : {};
      await apiFetch(item.route, {
        method: item.method === "POST" ? "POST" : "GET",
        token,
        body
      });
      markMutationSynced(item.id);
      syncedEvents.push({
        localId: item.id,
        route: item.route,
        syncType: "mutation_flush",
        createdAt: item.created_at
      });
    } catch {
      break;
    }
  }

  if (syncedEvents.length > 0) {
    await apiFetch("/api/mobile/sync/flush", {
      method: "POST",
      token,
      body: {
        events: syncedEvents
      }
    }).catch(() => undefined);
  }

  return syncedEvents.length;
}
