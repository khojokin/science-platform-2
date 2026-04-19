import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createZoomVideoToken } from "@/lib/zoom";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json()) as { sessionName?: string; roleType?: 0 | 1 };

  if (!body.sessionName) {
    return new NextResponse("Missing session name", { status: 400 });
  }

  try {
    const token = createZoomVideoToken({
      sessionName: body.sessionName,
      roleType: body.roleType ?? 0,
      userKey: userId,
      sessionKey: userId
    });

    return NextResponse.json({ token });
  } catch (cause) {
    return new NextResponse(cause instanceof Error ? cause.message : "Failed to create token", { status: 500 });
  }
}
