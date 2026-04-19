import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function createPublicSupabaseClient() {
  return createClient(env.supabaseUrl, env.supabasePublishableKey);
}

export async function createServerSupabaseClient() {
  const authObject = await auth();

  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    async accessToken() {
      return (await authObject.getToken()) ?? null;
    }
  });
}

export function createAdminSupabaseClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
