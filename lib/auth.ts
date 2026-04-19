import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/auth-config";
import { env } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase";

function buildDisplayName(user: Awaited<ReturnType<typeof currentUser>>) {
  if (!user) return "Scientist";
  const joined = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return joined || user.username || user.primaryEmailAddress?.emailAddress?.split("@")[0] || "Scientist";
}

export async function requireUserId() {
  if (!isClerkConfigured) {
    redirect("/");
  }

  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  return userId;
}

export async function ensureProfile() {
  if (!isClerkConfigured) {
    redirect("/");
  }

  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const admin = createAdminSupabaseClient();
  const handle =
    user.username ||
    `${user.primaryEmailAddress?.emailAddress?.split("@")[0]?.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase() || "scientist"}_${user.id.slice(-4)}`;

  await admin.from("profiles").upsert(
    {
      clerk_user_id: user.id,
      handle,
      display_name: buildDisplayName(user),
      avatar_url: user.imageUrl,
      interests: []
    },
    { onConflict: "clerk_user_id" }
  );

  return user.id;
}

export function isAdminUser(userId: string) {
  return env.adminUserIds.includes(userId);
}
