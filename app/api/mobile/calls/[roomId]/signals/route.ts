
import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase";
import { mobileJsonError, requireMobileUser } from "@/lib/mobile-auth";
import { createMobileSignal, listMobileSignals } from "@/lib/mobile-calls";

type Context = { params: Promise<{ roomId: string }> };

export async function GET(request: NextRequest, context: Context) {
  try {
    const { roomId } = await context.params;
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const membership = await admin.from("call_room_members").select("call_room_id").eq("call_room_id", roomId).eq("user_id", userId).maybeSingle();
    if (!membership.data) return mobileJsonError(403, "Join the room before reading signals.");
    const after = request.nextUrl.searchParams.get("after");
    const signals = await listMobileSignals(roomId, userId, after);
    const participants = await admin
      .from("mobile_call_participants")
      .select("user_id, display_name, is_audio_enabled, is_video_enabled, connection_state, last_seen_at")
      .eq("room_id", roomId)
      .is("left_at", null)
      .order("joined_at", { ascending: true });

    if (participants.error) throw participants.error;

    return NextResponse.json({
      signals,
      participants: participants.data ?? []
    });
  } catch (error) {
    return mobileJsonError(error);
  }
}

export async function POST(request: NextRequest, context: Context) {
  try {
    const { roomId } = await context.params;
    const { userId } = await requireMobileUser(request);
    const admin = createAdminSupabaseClient();
    const membership = await admin.from("call_room_members").select("call_room_id").eq("call_room_id", roomId).eq("user_id", userId).maybeSingle();
    if (!membership.data) return mobileJsonError(403, "Join the room before sending signals.");
    const body = await request.json().catch(() => ({} as Record<string, unknown>));

    const signalType = String(body.signalType ?? "").trim();
    const payload = typeof body.payload === "object" && body.payload ? body.payload as Record<string, unknown> : {};

    if (!signalType) {
      return mobileJsonError(400, "signalType is required.");
    }

    const signal = await createMobileSignal({
      roomId,
      senderUserId: userId,
      recipientUserId: typeof body.recipientUserId === "string" ? body.recipientUserId : null,
      signalType,
      payload
    });

    return NextResponse.json({ signal });
  } catch (error) {
    return mobileJsonError(error);
  }
}
