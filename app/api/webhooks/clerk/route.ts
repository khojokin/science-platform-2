import { storeWebhookEvent } from "@/lib/background-jobs";
import { verifyWebhook } from "@clerk/backend/webhooks";
import { createAdminSupabaseClient } from "@/lib/supabase";

function toDisplayName(data: Record<string, unknown>) {
  const joined = [data.first_name, data.last_name].filter(Boolean).join(" ").trim();
  return joined || String(data.username || "Scientist");
}

function toHandle(data: Record<string, unknown>) {
  const username = String(data.username || "").trim().toLowerCase();
  if (username) return username;
  const email = Array.isArray(data.email_addresses) ? data.email_addresses[0] as { email_address?: string } : undefined;
  const base = String(email?.email_address?.split("@")[0] || "scientist")
    .replace(/[^a-z0-9_]/g, "")
    .toLowerCase();

  return `${base || "scientist"}_${String(data.id).slice(-4).toLowerCase()}`;
}

export async function POST(request: Request) {
  const admin = createAdminSupabaseClient();

  try {
    const event = await verifyWebhook(request);
    await storeWebhookEvent({
      provider: "clerk",
      eventType: event.type,
      externalId: String((event.data as any).id ?? ""),
      signatureValid: true,
      payload: event as unknown as Record<string, unknown>
    });

    if (event.type === "user.created" || event.type === "user.updated") {
      const payload = event.data as any;

      await admin.from("profiles").upsert(
        {
          clerk_user_id: String(payload.id),
          handle: toHandle(payload),
          display_name: toDisplayName(payload),
          avatar_url: String(payload.image_url || ""),
          interests: []
        },
        { onConflict: "clerk_user_id" }
      );
    }

    if (event.type === "user.deleted") {
      const payload = event.data as any;
      if (payload.id) {
        await admin
          .from("profiles")
          .update({
            handle: null,
            display_name: "Deleted User",
            headline: "",
            bio: "This account has been removed."
          })
          .eq("clerk_user_id", String(payload.id));
      }
    }

    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("Clerk webhook error", error);
    return new Response("invalid webhook", { status: 400 });
  }
}
