import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildGoogleCalendarAuthorizationUrl, createCalendarState, hasGoogleCalendar } from "@/lib/calendar";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
  }

  if (!hasGoogleCalendar()) {
    return NextResponse.json({ error: "Google Calendar is not configured." }, { status: 400 });
  }

  const state = createCalendarState(userId);
  const cookieStore = await cookies();
  cookieStore.set("google_calendar_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10
  });

  return NextResponse.redirect(buildGoogleCalendarAuthorizationUrl(state));
}
