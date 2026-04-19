
import { env } from "@/lib/env";

type TurnstileResult = {
  success: boolean;
  "error-codes"?: string[];
};

export async function validateTurnstileToken(token: string, ip?: string | null) {
  if (!env.turnstileSecretKey) {
    return { ok: true, reason: "turnstile-not-configured" as const };
  }

  if (!token) {
    return { ok: false, reason: "missing-token" as const };
  }

  const body = new URLSearchParams({
    secret: env.turnstileSecretKey,
    response: token
  });

  if (ip) {
    body.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body
  });

  const data = (await response.json()) as TurnstileResult;

  if (!data.success) {
    return {
      ok: false,
      reason: data["error-codes"]?.join(",") || "verification-failed"
    };
  }

  return { ok: true, reason: "verified" as const };
}
