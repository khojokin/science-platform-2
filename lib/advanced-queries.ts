
import { auth } from "@clerk/nextjs/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import { embedText, hasOpenAI } from "@/lib/openai";

type ServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

function canSeeDocument(result: Record<string, unknown>, userId?: string | null) {
  const visibility = String(result.visibility ?? "public");
  const ownerId = result.owner_id ? String(result.owner_id) : null;
  if (visibility === "public" || visibility === "premium") return true;
  return Boolean(userId && ownerId === userId);
}

export async function listWorkspaceProfiles(client: ServerClient, userId: string) {
  const { data, error } = await client
    .from("workspace_profiles")
    .select("*")
    .or(`owner_id.eq.${userId},is_public.eq.true`)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getWorkspaceProfileByOrg(client: ServerClient, clerkOrgId: string) {
  const { data, error } = await client
    .from("workspace_profiles")
    .select("*")
    .eq("clerk_org_id", clerkOrgId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listResearchClubs(client: ServerClient) {
  const { data, error } = await client
    .from("research_clubs")
    .select("*, workspace:workspace_profiles(name, slug)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listPaperSessions(client: ServerClient) {
  const { data, error } = await client
    .from("paper_sessions")
    .select("*, club:research_clubs(title, slug)")
    .order("scheduled_for", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listLabProjects(client: ServerClient) {
  const { data, error } = await client
    .from("lab_projects")
    .select("*, workspace:workspace_profiles(name, slug)")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listLabNotebookEntries(client: ServerClient, limit = 20) {
  const { data, error } = await client
    .from("lab_notebooks")
    .select("*, project:lab_projects(title, slug), author:profiles!fk_lab_notebooks_author(display_name, handle)")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function listVaultItems(client: ServerClient, userId: string) {
  const { data, error } = await client
    .from("resource_vault_items")
    .select("*")
    .or(`visibility.eq.public,visibility.eq.premium,owner_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listQuestionBounties(client: ServerClient) {
  const { data, error } = await client
    .from("question_bounties")
    .select("*, author:profiles!fk_question_bounties_author(display_name, handle)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listBountyResponses(client: ServerClient, bountyIds: string[]) {
  if (bountyIds.length === 0) return [];
  const { data, error } = await client
    .from("bounty_responses")
    .select("*, author:profiles!fk_bounty_responses_author(display_name, handle)")
    .in("bounty_id", bountyIds)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listEvents(client: ServerClient) {
  const { data, error } = await client
    .from("events")
    .select("*, organizer:profiles!fk_events_organizer(display_name, handle), workspace:workspace_profiles(name, slug)")
    .order("scheduled_for", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listEventRegistrationIds(client: ServerClient, userId: string) {
  const { data, error } = await client.from("event_registrations").select("event_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((item) => String(item.event_id)));
}

export async function listCampusChapters(client: ServerClient) {
  const { data, error } = await client
    .from("campus_chapters")
    .select("*, lead:profiles!fk_campus_chapters_lead(display_name, handle)")
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function listChapterMembershipIds(client: ServerClient, userId: string) {
  const { data, error } = await client.from("chapter_members").select("chapter_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((item) => String(item.chapter_id)));
}

export async function listVerificationRequests(client: ServerClient, userId: string) {
  const { data, error } = await client
    .from("verification_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listVerifiedExperts(client: ServerClient) {
  const { data, error } = await client
    .from("reputations")
    .select("*, profile:profiles!fk_reputations_user(display_name, handle, headline, role)")
    .eq("verified_expert", true)
    .order("score", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function listReputationLeaderboard(client: ServerClient) {
  const { data, error } = await client
    .from("reputations")
    .select("*, profile:profiles!fk_reputations_user(display_name, handle)")
    .order("score", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

export async function getWallet(client: ServerClient, userId: string) {
  const { data, error } = await client.from("user_wallets").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function listCallRecordings(client: ServerClient, userId: string) {
  const { data, error } = await client
    .from("call_recordings")
    .select("*, room:call_rooms(title, slug)")
    .or(`is_public.eq.true,created_by.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function searchKnowledge(query: string, userId?: string | null) {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const admin = createAdminSupabaseClient();

  if (hasOpenAI()) {
    try {
      const embedding = await embedText(trimmed);
      const { data, error } = await admin.rpc("match_search_documents", {
        query_embedding: `[${embedding.join(",")}]`,
        match_count: 12
      });

      if (error) throw error;
      return ((data ?? []) as Array<Record<string, unknown>>).filter((item) => canSeeDocument(item, userId));
    } catch (error) {
      console.error("Semantic search fallback engaged", error);
    }
  }

  const { data, error } = await admin
    .from("search_documents")
    .select("*")
    .or(`title.ilike.%${trimmed}%,body.ilike.%${trimmed}%`)
    .order("updated_at", { ascending: false })
    .limit(12);

  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).filter((item) => canSeeDocument(item, userId));
}

export async function getSearchContext(query: string) {
  const { userId } = await auth();
  const results = await searchKnowledge(query, userId);
  return results
    .slice(0, 6)
    .map((item) => `- ${String(item.title ?? "Untitled")}: ${String(item.body ?? "").slice(0, 400)}`)
    .join("\n");
}

export async function getBillingPortalSubscription(userId: string) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("stripe_customer_id, tier, status")
    .eq("user_id", userId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
