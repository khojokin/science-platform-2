import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient, createPublicSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

const fallbackCards = [
  {
    key: "investor_pitch",
    audience: "investors",
    title: "Investor presentation mode",
    summary: "Traction, monetization, and defensibility in one guided story.",
    route_href: "/demo/presentation?audience=investors",
    metrics: { waitlist: 12400, paidConversion: 0.083, grossMargin: 0.78 },
    bullets: [
      "Premium subscriptions plus expert services plus institutions",
      "LiveKit, AI, and workspaces deepen retention and switching costs",
      "Operations console, backups, and audit exports reduce launch risk"
    ]
  },
  {
    key: "institution_workspace",
    audience: "institutions",
    title: "Institution workspace story",
    summary: "Private workspaces, events, recordings, and moderation for clubs and labs.",
    route_href: "/demo/presentation?audience=institutions",
    metrics: { institutionSeats: 780, workspaceAdmins: 14, eventsPerMonth: 18 },
    bullets: [
      "Clerk organizations map to labs, clubs, and teams",
      "Private calls and recordings become reusable knowledge assets",
      "Moderation, audit exports, and billing portal fit procurement flows"
    ]
  }
];

export async function getCallRoomForLiveKit(client: ServerClient, roomIdOrSlug: string, userId: string) {
  const lookup = roomIdOrSlug.trim();
  const query = client
    .from("call_rooms")
    .select(`
      *,
      members:call_room_members(user_id, role, profile:profiles(handle, display_name))
    `)
    .or(`id.eq.${lookup},slug.eq.${lookup}`)
    .limit(1);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const isMember = Array.isArray(data.members) && data.members.some((member: any) => member.user_id === userId);
  if (data.is_private && data.host_user_id !== userId && !isMember) {
    return null;
  }

  return data;
}

export async function getLiveKitOverview(userId: string) {
  const client = await createServerSupabaseClient();

  const [rooms, sessions, exports] = await Promise.all([
    client
      .from("call_rooms")
      .select("id, title, slug, provider, media_mode, is_private, host_user_id, created_at")
      .in("provider", ["livekit_sfu", "native_mesh", "zoom_video", "zoom_meeting"])
      .order("created_at", { ascending: false })
      .limit(12),
    client
      .from("call_room_sfu_sessions")
      .select("id, room_name, status, active_participants, started_at, ended_at, call_room:call_rooms(title, slug)")
      .order("started_at", { ascending: false })
      .limit(12),
    client
      .from("call_recording_exports")
      .select("id, room_name, status, output_type, playback_url, created_at, call_room:call_rooms(title, slug)")
      .order("created_at", { ascending: false })
      .limit(12)
  ]);

  return {
    userId,
    rooms: rooms.data ?? [],
    sessions: sessions.data ?? [],
    exports: exports.data ?? []
  };
}

export async function listDemoShowcaseCards(audience?: string | null) {
  try {
    const admin = env.supabaseServiceRoleKey ? createAdminSupabaseClient() : createPublicSupabaseClient();
    let query = admin.from("demo_showcase_cards").select("*").order("position");
    if (audience) {
      query = query.or(`audience.eq.${audience},audience.eq.general`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? fallbackCards;
  } catch {
    if (!audience) return fallbackCards;
    return fallbackCards.filter((card) => card.audience === audience || card.audience === "general");
  }
}

export async function getSeededInvestorDeck() {
  const { userId } = await auth();

  try {
    const admin = env.supabaseServiceRoleKey ? createAdminSupabaseClient() : createPublicSupabaseClient();
    const [cards, communities, events, recordings, workspaces] = await Promise.all([
      listDemoShowcaseCards("investors"),
      admin.from("communities").select("id", { count: "exact", head: true }),
      admin.from("events").select("id", { count: "exact", head: true }),
      admin.from("call_recording_exports").select("id", { count: "exact", head: true }),
      admin.from("workspace_profiles").select("id", { count: "exact", head: true })
    ]);

    return {
      viewer: userId,
      cards,
      headlineMetrics: [
        { label: "Communities", value: communities.count ?? 0 },
        { label: "Events", value: events.count ?? 0 },
        { label: "Recording exports", value: recordings.count ?? 0 },
        { label: "Workspaces", value: workspaces.count ?? 0 }
      ]
    };
  } catch {
    return {
      viewer: userId,
      cards: fallbackCards,
      headlineMetrics: [
        { label: "Communities", value: 12 },
        { label: "Events", value: 26 },
        { label: "Recording exports", value: 46 },
        { label: "Workspaces", value: 9 }
      ]
    };
  }
}
