"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrowserSupabaseClient } from "@/lib/browser-supabase";

type Props = {
  conversationId: string;
};

export function RealtimeConversationRefresher({ conversationId }: Props) {
  const client = useBrowserSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const channel = client
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, conversationId, router]);

  return null;
}
