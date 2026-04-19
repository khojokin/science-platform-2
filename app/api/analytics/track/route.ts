import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { trackAnalyticsEvent } from "@/lib/analytics";
import { consumeRateLimit } from "@/lib/rate-limit";
import { env } from "@/lib/env";

function getClientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || null;
}

export async function POST(request: Request) {
  const writeKey = request.headers.get("x-analytics-key") ?? "";
  if (env.analyticsWriteKey && writeKey !== env.analyticsWriteKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await auth();
  const ip = getClientIp(request);
  const guard = await consumeRateLimit({
    action: "analytics.track",
    limit: 60,
    windowSeconds: 60,
    userId,
    ip,
    route: "/api/analytics/track"
  });

  if (!guard.ok) {
    return NextResponse.json({ error: "Too many events" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  await trackAnalyticsEvent({
    eventName: String(body?.eventName ?? "page_view"),
    userId,
    sessionKey: body?.sessionKey ? String(body.sessionKey) : null,
    path: body?.path ? String(body.path) : null,
    properties: typeof body?.properties === "object" && body.properties ? body.properties : {}
  });

  return NextResponse.json({ ok: true });
}
