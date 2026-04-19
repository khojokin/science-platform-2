"use client";

import { useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

export function useBrowserSupabaseClient() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        async accessToken() {
          return (await getToken()) ?? null;
        }
      }),
    [getToken]
  );
}
