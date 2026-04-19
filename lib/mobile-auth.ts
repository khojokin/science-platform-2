import { NextRequest } from "next/server";
import { verifyToken } from "@clerk/backend";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

type MobileAuthResult = {
  userId: string;
  profile: {
    clerk_user_id: string;
    display_name: string;
    handle: string | null;
    avatar_url: string | null;
    role: string | null;
  };
};

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }
  return header.slice(7).trim();
}

async function ensureMobileProfile(userId: string) {
  const admin = createAdminSupabaseClient();
  const existing = await admin
    .from("profiles")
    .select("clerk_user_id, display_name, handle, avatar_url, role")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (existing.data) {
    return existing.data;
  }

  const fallbackHandle = `scientist_${userId.slice(-8).toLowerCase()}`;

  const inserted = await admin
    .from("profiles")
    .upsert(
      {
        clerk_user_id: userId,
        display_name: "Scientist",
        handle: fallbackHandle,
        avatar_url: "",
        role: "student",
        interests: []
      },
      { onConflict: "clerk_user_id" }
    )
    .select("clerk_user_id, display_name, handle, avatar_url, role")
    .single();

  if (inserted.error) {
    throw inserted.error;
  }

  return inserted.data;
}

export async function requireMobileUser(request: NextRequest): Promise<MobileAuthResult> {
  const token = getBearerToken(request);

  if (!token) {
    throw new Error("Missing bearer token.");
  }

  const verified = await verifyToken(token, {
    secretKey: env.clerkSecretKey || undefined,
    jwtKey: env.clerkJwtKey || undefined,
    authorizedParties: env.clerkAuthorizedParties.length > 0 ? env.clerkAuthorizedParties : undefined
  });

  const userId = typeof verified.sub === "string" ? verified.sub : "";

  if (!userId) {
    throw new Error("Token verification failed.");
  }

  const profile = await ensureMobileProfile(userId);

  return {
    userId,
    profile
  };
}

export function mobileJsonError(statusOrError: number | unknown, message?: string) {
  if (typeof statusOrError === "number") {
    return Response.json({ error: message ?? "Request failed." }, { status: statusOrError });
  }

  const errorMessage = statusOrError instanceof Error ? statusOrError.message : "Request failed.";
  return Response.json({ error: errorMessage }, { status: 400 });
}


export async function getMobileBearerUserId(request: NextRequest) {
  const result = await requireMobileUser(request);
  return result.userId;
}
