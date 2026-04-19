import { NextResponse } from "next/server";
import { storeWebhookEvent } from "@/lib/background-jobs";

export async function POST(request: Request) {
  const payload = await request.json().catch(() => ({}));
  const eventType = String(payload?.event ?? payload?.eventType ?? "zoom.unknown");
  const externalId = String(payload?.payload?.object?.uuid ?? payload?.payload?.object?.id ?? "");

  await storeWebhookEvent({
    provider: "zoom",
    eventType,
    externalId: externalId || null,
    signatureValid: true,
    payload
  });

  return NextResponse.json({ ok: true });
}
