import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleCode, fetchGoogleUserInfo, upsertGoogleCalendarConnection } from "@/lib/calendar";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("google_calendar_state")?.value ?? "";

  if (!code || !state || expectedState !== state) {
    return NextResponse.redirect(new URL("/calendar?error=google_state", request.url));
  }

  const userId = state.split(":")[0];
  const token = await exchangeGoogleCode(code);
  const profile = await fetchGoogleUserInfo(token.access_token);

  await upsertGoogleCalendarConnection({
    userId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresIn: token.expires_in,
    scope: token.scope,
    externalAccountId: profile.sub,
    profile
  });

  cookieStore.delete("google_calendar_state");
  return NextResponse.redirect(new URL("/calendar?connected=google", request.url));
}
