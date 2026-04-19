import { createAdminSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

type ServerClient = Awaited<ReturnType<typeof import("@/lib/supabase").createServerSupabaseClient>>;
type PublicClient = ReturnType<typeof import("@/lib/supabase").createPublicSupabaseClient>;

async function attachSignedUrlsToPosts(posts: Array<Record<string, unknown>>) {
  if (!env.supabaseServiceRoleKey || posts.length === 0) {
    return posts;
  }

  const admin = createAdminSupabaseClient();
  const postIds = posts.map((post) => String(post.id));
  const { data: attachments, error } = await admin
    .from("post_attachments")
    .select("id, post_id, file_name, content_type, byte_size, object_path, created_at")
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error) throw error;

  const byPostId = new Map<string, Array<Record<string, unknown>>>();

  for (const attachment of attachments ?? []) {
    const { data: signed } = await admin.storage.from(env.supabaseUploadsBucket).createSignedUrl(String(attachment.object_path), 60 * 60);
    const list = byPostId.get(String(attachment.post_id)) ?? [];
    list.push({
      ...attachment,
      signed_url: signed?.signedUrl ?? null
    });
    byPostId.set(String(attachment.post_id), list);
  }

  return posts.map((post) => ({
    ...post,
    attachments: byPostId.get(String(post.id)) ?? []
  }));
}

export async function listCommunities(client: ServerClient) {
  const { data, error } = await client
    .from("communities")
    .select(`
      id,
      name,
      slug,
      description,
      is_private,
      created_by,
      created_at,
      creator:profiles!fk_communities_created_by(display_name, handle)
    `)
    .order("name");

  if (error) throw error;
  return data ?? [];
}

export async function listCommunityMembershipIds(client: ServerClient, userId: string) {
  const { data, error } = await client.from("community_members").select("community_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((item) => item.community_id as string));
}

export async function listFeedPosts(client: ServerClient) {
  const { data, error } = await client
    .from("posts")
    .select(`
      id,
      title,
      body,
      tags,
      created_at,
      updated_at,
      community_id,
      author_id,
      community:communities!fk_posts_community(id, name, slug),
      author:profiles!fk_posts_author(clerk_user_id, display_name, handle, avatar_url)
    `)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return attachSignedUrlsToPosts((data ?? []) as Array<Record<string, unknown>>);
}

export async function getCommunityBySlug(client: ServerClient, slug: string) {
  const { data, error } = await client
    .from("communities")
    .select(`
      id,
      name,
      slug,
      description,
      is_private,
      created_by,
      created_at,
      creator:profiles!fk_communities_created_by(display_name, handle)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listPostsByCommunity(client: ServerClient, communityId: string) {
  const { data, error } = await client
    .from("posts")
    .select(`
      id,
      title,
      body,
      tags,
      created_at,
      updated_at,
      author_id,
      author:profiles!fk_posts_author(clerk_user_id, display_name, handle, avatar_url)
    `)
    .eq("community_id", communityId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return attachSignedUrlsToPosts((data ?? []) as Array<Record<string, unknown>>);
}

export async function listCommentsByPostIds(client: ServerClient, postIds: string[]) {
  if (postIds.length === 0) return [];

  const { data, error } = await client
    .from("comments")
    .select(`
      id,
      post_id,
      author_id,
      body,
      created_at,
      updated_at,
      author:profiles!fk_comments_author(clerk_user_id, display_name, handle)
    `)
    .in("post_id", postIds)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listStudyGroups(client: ServerClient) {
  const { data, error } = await client
    .from("study_groups")
    .select(`
      id,
      name,
      slug,
      description,
      visibility,
      scheduled_for,
      owner_id,
      created_at,
      updated_at,
      owner:profiles!fk_study_groups_owner(clerk_user_id, display_name, handle)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listStudyGroupMembershipIds(client: ServerClient, userId: string) {
  const { data, error } = await client.from("study_group_members").select("study_group_id").eq("user_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((item) => item.study_group_id as string));
}

export async function listUserConversations(client: ServerClient, userId: string) {
  const { data: memberships, error: membershipsError } = await client
    .from("conversation_members")
    .select("conversation_id")
    .eq("user_id", userId);

  if (membershipsError) throw membershipsError;

  const conversationIds = (memberships ?? []).map((item) => item.conversation_id as string);

  if (conversationIds.length === 0) {
    return [];
  }

  const [
    { data: conversations, error: conversationsError },
    { data: members, error: membersError },
    { data: messages, error: messagesError }
  ] = await Promise.all([
    client.from("conversations").select("id, title, type, created_at").in("id", conversationIds).order("created_at", { ascending: false }),
    client.from("conversation_members").select("conversation_id, user_id").in("conversation_id", conversationIds),
    client.from("messages").select("id, conversation_id, sender_id, body, created_at").in("conversation_id", conversationIds).order("created_at", { ascending: true })
  ]);

  if (conversationsError) throw conversationsError;
  if (membersError) throw membersError;
  if (messagesError) throw messagesError;

  const profileIds = new Set<string>();
  for (const member of members ?? []) profileIds.add(String(member.user_id));
  for (const message of messages ?? []) profileIds.add(String(message.sender_id));

  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("clerk_user_id, display_name, handle")
    .in("clerk_user_id", Array.from(profileIds));

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.clerk_user_id), profile]));
  const messagesByConversation = new Map<string, Array<Record<string, unknown>>>();
  const membersByConversation = new Map<string, Array<Record<string, unknown>>>();

  for (const message of messages ?? []) {
    const list = messagesByConversation.get(String(message.conversation_id)) ?? [];
    list.push({
      ...message,
      sender: profileMap.get(String(message.sender_id))
    });
    messagesByConversation.set(String(message.conversation_id), list);
  }

  for (const member of members ?? []) {
    const list = membersByConversation.get(String(member.conversation_id)) ?? [];
    list.push({
      ...member,
      profile: profileMap.get(String(member.user_id))
    });
    membersByConversation.set(String(member.conversation_id), list);
  }

  return (conversations ?? []).map((conversation) => ({
    ...conversation,
    members: membersByConversation.get(String(conversation.id)) ?? [],
    messages: messagesByConversation.get(String(conversation.id)) ?? []
  }));
}

export async function getCurrentProfile(client: ServerClient, userId: string) {
  const { data, error } = await client
    .from("profiles")
    .select("clerk_user_id, display_name, handle, headline, bio, avatar_url, role, interests, created_at")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getPublicProfileByHandle(client: PublicClient, handle: string) {
  const { data, error } = await client
    .from("profiles")
    .select("clerk_user_id, display_name, handle, headline, bio, avatar_url, role, interests, created_at")
    .eq("handle", handle)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listPostsByAuthor(client: PublicClient, authorId: string) {
  const { data, error } = await client
    .from("posts")
    .select(`
      id,
      title,
      body,
      tags,
      created_at,
      community:communities!fk_posts_community(name, slug)
    `)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listFollowingIds(client: ServerClient, userId: string) {
  const { data, error } = await client.from("follows").select("following_id").eq("follower_id", userId);
  if (error) throw error;
  return new Set((data ?? []).map((item) => item.following_id as string));
}

export async function getSubscriptionForUser(client: ServerClient, userId: string) {
  const { data, error } = await client
    .from("subscriptions")
    .select("user_id, tier, status, stripe_price_id, current_period_end, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listNotificationsForUser(client: ServerClient, userId: string) {
  const { data, error } = await client
    .from("notifications")
    .select("id, user_id, actor_id, type, title, body, href, metadata, read_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  const actorIds = Array.from(new Set((data ?? []).map((row) => row.actor_id).filter(Boolean))) as string[];

  if (actorIds.length === 0) {
    return data ?? [];
  }

  const { data: actors, error: actorsError } = await client
    .from("profiles")
    .select("clerk_user_id, display_name, handle")
    .in("clerk_user_id", actorIds);

  if (actorsError) throw actorsError;

  const actorMap = new Map((actors ?? []).map((actor) => [String(actor.clerk_user_id), actor]));
  return (data ?? []).map((notification) => ({
    ...notification,
    actor: notification.actor_id ? actorMap.get(String(notification.actor_id)) ?? null : null
  }));
}

export async function listReportsForAdmin() {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, details, status, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function listAuditLogsForAdmin(limit = 50) {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("audit_logs")
    .select("id, actor_id, action, entity_type, entity_id, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function listCallRooms(client: ServerClient, userId: string) {
  const [{ data: rooms, error }, { data: memberships, error: memberError }] = await Promise.all([
    client
      .from("call_rooms")
      .select(`
        id,
        slug,
        title,
        description,
        provider,
        media_mode,
        is_private,
        host_user_id,
        meeting_number,
        meeting_password,
        zoom_session_name,
        zoom_session_password,
        max_participants,
        created_at,
        updated_at,
        host:profiles!fk_call_rooms_host(clerk_user_id, display_name, handle)
      `)
      .order("created_at", { ascending: false }),
    client.from("call_room_members").select("call_room_id").eq("user_id", userId)
  ]);

  if (error) throw error;
  if (memberError) throw memberError;

  const membershipIds = new Set((memberships ?? []).map((row) => String(row.call_room_id)));
  return (rooms ?? []).map((room) => ({
    ...room,
    joined: membershipIds.has(String(room.id))
  }));
}

export async function getCallRoomBySlug(client: ServerClient, slug: string, userId: string) {
  const { data: room, error } = await client
    .from("call_rooms")
    .select(`
      id,
      slug,
      title,
      description,
      provider,
      media_mode,
      is_private,
      host_user_id,
      meeting_number,
      meeting_password,
      zoom_session_name,
      zoom_session_password,
      max_participants,
      created_at,
      updated_at,
      host:profiles!fk_call_rooms_host(clerk_user_id, display_name, handle)
    `)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!room) return null;

  const [{ data: members, error: memberError }, { data: myMembership, error: myMembershipError }] = await Promise.all([
    client.from("call_room_members").select("call_room_id, user_id, role, created_at").eq("call_room_id", room.id),
    client.from("call_room_members").select("call_room_id, role").eq("call_room_id", room.id).eq("user_id", userId).maybeSingle()
  ]);

  if (memberError) throw memberError;
  if (myMembershipError) throw myMembershipError;

  const memberIds = (members ?? []).map((member) => String(member.user_id));
  const { data: profiles, error: profilesError } = await client
    .from("profiles")
    .select("clerk_user_id, display_name, handle")
    .in("clerk_user_id", memberIds.length ? memberIds : ["__none__"]);

  if (profilesError) throw profilesError;

  const profileMap = new Map((profiles ?? []).map((profile) => [String(profile.clerk_user_id), profile]));

  return {
    ...room,
    members: (members ?? []).map((member) => ({
      ...member,
      profile: profileMap.get(String(member.user_id)) ?? null
    })),
    joined: Boolean(myMembership)
  };
}
