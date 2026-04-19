"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrowserSupabaseClient } from "@/lib/browser-supabase";

type Props = {
  userId: string;
};

export function RealtimeNotificationsRefresher({ userId }: Props) {
  const client = useBrowserSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    const channel = client
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`
        },
        () => router.refresh()
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [client, router, userId]);

  return null;
}
