import { NextRequest, NextResponse } from "next/server";
import { registerExpoPushDevice } from "@/lib/expo-push";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireMobileUser(request);
    const body = await request.json().catch(() => ({}));
    const expoPushToken = String(body.expoPushToken ?? "").trim();

    if (!expoPushToken) {
      return NextResponse.json({ error: "expoPushToken is required." }, { status: 400 });
    }

    const device = await registerExpoPushDevice({
      userId,
      expoPushToken,
      platform: String(body.platform ?? "unknown"),
      deviceName: String(body.deviceName ?? ""),
      appBuild: String(body.appBuild ?? ""),
      metadata: typeof body.metadata === "object" && body.metadata ? body.metadata : {}
    });

    return NextResponse.json({ device });
  } catch (error) {
    return mobileJsonError(error);
  }
}
