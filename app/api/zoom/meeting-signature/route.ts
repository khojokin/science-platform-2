import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createZoomMeetingSignature } from "@/lib/zoom";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as { meetingNumber?: string; role?: 0 | 1 };

  if (!body.meetingNumber) {
    return new NextResponse("Missing meeting number", { status: 400 });
  }

  try {
    const signature = createZoomMeetingSignature({
      meetingNumber: body.meetingNumber,
      role: body.role ?? 0,
      videoWebRtcMode: 1
    });

    return NextResponse.json({ signature, sdkKey: env.zoomMeetingSdkKey });
  } catch (cause) {
    return new NextResponse(cause instanceof Error ? cause.message : "Failed to create signature", { status: 500 });
  }
}
