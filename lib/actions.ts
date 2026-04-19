"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import { isAdminUser, requireUserId } from "@/lib/auth";
import { env } from "@/lib/env";
import { assertActionRateLimit, enforceCleanContent, logAuditEvent } from "@/lib/moderation";
import { createManagedZoomMeeting } from "@/lib/zoom";
import { looksLikeMeetingNumber, normalizeHandle, parseCommaList, slugify, truncate, truthy } from "@/lib/utils";

async function createNotification(input: {
  userId: string;
  actorId?: string | null;
  type: "follow" | "comment" | "message" | "system";
  title: string;
  body?: string;
  href?: string;
  metadata?: Record<string, unknown>;
}) {
  if (!input.userId || (input.actorId && input.userId === input.actorId)) {
    return;
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId,
    actor_id: input.actorId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? "",
    href: input.href ?? "",
    metadata: input.metadata ?? {}
  });

  if (error) {
    console.error("Failed to create notification", error);
  }
}

async function uploadPostAttachment(postId: string, uploaderId: string, file: File) {
  if (!file || file.size === 0) {
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Attachments must be 10 MB or smaller.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").toLowerCase();
  const objectPath = `posts/${postId}/${Date.now()}-${safeName}`;
  const admin = createAdminSupabaseClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(env.supabaseUploadsBucket).upload(objectPath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    throw uploadError;
  }

  const { error: insertError } = await admin.from("post_attachments").insert({
    post_id: postId,
    uploader_id: uploaderId,
    bucket: env.supabaseUploadsBucket,
    object_path: objectPath,
    file_name: file.name,
    content_type: file.type || "application/octet-stream",
    byte_size: file.size
  });

  if (insertError) {
    throw insertError;
  }
}

async function cleanupPostAttachments(postId: string) {
  if (!env.supabaseServiceRoleKey) return;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("post_attachments").select("object_path").eq("post_id", postId);
  if (error) throw error;

  const paths = (data ?? []).map((item) => String(item.object_path));
  if (paths.length > 0) {
    await admin.storage.from(env.supabaseUploadsBucket).remove(paths);
  }
}

export async function updateProfileAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();

  const payload = {
    clerk_user_id: userId,
    display_name: String(formData.get("display_name") ?? "").trim() || "Scientist",
    handle: normalizeHandle(String(formData.get("handle") ?? "")),
    headline: String(formData.get("headline") ?? "").trim(),
    bio: String(formData.get("bio") ?? "").trim(),
    avatar_url: String(formData.get("avatar_url") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    interests: parseCommaList(formData.get("interests"))
  };

  await enforceCleanContent(userId, "profile_update", payload.display_name, payload.headline, payload.bio);

  const { error } = await client.from("profiles").upsert(payload, { onConflict: "clerk_user_id" });
  if (error) throw error;

  await logAuditEvent({ userId, action: "profile.updated", entityType: "profile", entityId: userId });
  revalidatePath("/profile");
  revalidatePath(`/u/${payload.handle}`);
}

export async function createCommunityAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPrivate = truthy(formData.get("is_private"));
  const slug = slugify(name);

  await assertActionRateLimit({ userId, action: "community.create", limit: 10, windowSeconds: 3600 });
  await enforceCleanContent(userId, "community_create", name, description);

  const { data, error } = await client
    .from("communities")
    .insert({ name, slug, description, is_private: isPrivate })
    .select("id, slug")
    .single();

  if (error) throw error;

  await client.from("community_members").upsert({
    community_id: data.id,
    user_id: userId,
    role: "owner"
  });

  await logAuditEvent({ userId, action: "community.created", entityType: "community", entityId: String(data.id) });
  redirect(`/communities/${data.slug}`);
}

export async function updateCommunityAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const communityId = String(formData.get("community_id") ?? "");
  const path = String(formData.get("path") ?? "/communities");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const isPrivate = truthy(formData.get("is_private"));
  const slug = slugify(name);

  await enforceCleanContent(userId, "community_update", name, description);

  const { data, error } = await client
    .from("communities")
    .update({ name, slug, description, is_private: isPrivate })
    .eq("id", communityId)
    .eq("created_by", userId)
    .select("id, slug")
    .single();

  if (error) throw error;

  await logAuditEvent({ userId, action: "community.updated", entityType: "community", entityId: String(data.id) });
  revalidatePath("/communities");
  revalidatePath(path);
  if (path !== `/communities/${data.slug}`) {
    redirect(`/communities/${data.slug}`);
  }
}

export async function deleteCommunityAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const communityId = String(formData.get("community_id") ?? "");

  const { error } = await client.from("communities").delete().eq("id", communityId).eq("created_by", userId);
  if (error) throw error;

  await logAuditEvent({ userId, action: "community.deleted", entityType: "community", entityId: communityId });
  revalidatePath("/communities");
  revalidatePath("/feed");
  redirect("/communities");
}

export async function toggleCommunityMembershipAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const communityId = String(formData.get("community_id") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const { data: existing, error: existingError } = await client
    .from("community_members")
    .select("community_id")
    .eq("community_id", communityId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await client.from("community_members").delete().eq("community_id", communityId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await client.from("community_members").insert({ community_id: communityId, user_id: userId });
    if (error) throw error;
  }

  revalidatePath("/communities");
  if (slug) revalidatePath(`/communities/${slug}`);
  revalidatePath("/feed");
}

export async function createPostAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const communityId = String(formData.get("community_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tags = parseCommaList(formData.get("tags"));
  const path = String(formData.get("path") ?? "/feed");
  const attachment = formData.get("attachment");

  await assertActionRateLimit({ userId, action: "post.create", limit: 12, windowSeconds: 900 });
  await enforceCleanContent(userId, "post_create", title, body);

  const { data: post, error } = await client
    .from("posts")
    .insert({ community_id: communityId, title, body, tags })
    .select("id")
    .single();

  if (error) throw error;

  if (attachment instanceof File && attachment.size > 0) {
    await uploadPostAttachment(post.id, userId, attachment);
  }

  await logAuditEvent({ userId, action: "post.created", entityType: "post", entityId: String(post.id) });
  revalidatePath(path);
  revalidatePath("/feed");
}

export async function updatePostAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const postId = String(formData.get("post_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const tags = parseCommaList(formData.get("tags"));
  const path = String(formData.get("path") ?? "/feed");
  const attachment = formData.get("attachment");

  await enforceCleanContent(userId, "post_update", title, body);

  const { data: post, error } = await client
    .from("posts")
    .update({ title, body, tags })
    .eq("id", postId)
    .eq("author_id", userId)
    .select("id")
    .single();

  if (error) throw error;

  if (attachment instanceof File && attachment.size > 0) {
    await uploadPostAttachment(post.id, userId, attachment);
  }

  await logAuditEvent({ userId, action: "post.updated", entityType: "post", entityId: String(post.id) });
  revalidatePath(path);
  revalidatePath("/feed");
}

export async function deletePostAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const postId = String(formData.get("post_id") ?? "");
  const path = String(formData.get("path") ?? "/feed");

  await cleanupPostAttachments(postId);

  const { error } = await client.from("posts").delete().eq("id", postId).eq("author_id", userId);
  if (error) throw error;

  await logAuditEvent({ userId, action: "post.deleted", entityType: "post", entityId: postId });
  revalidatePath(path);
  revalidatePath("/feed");
}

export async function createCommentAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const path = String(formData.get("path") ?? "/feed");

  await assertActionRateLimit({ userId, action: "comment.create", limit: 20, windowSeconds: 900 });
  await enforceCleanContent(userId, "comment_create", body);

  const { data: comment, error } = await client.from("comments").insert({ post_id: postId, body }).select("id").single();
  if (error) throw error;

  const { data: post } = await admin
    .from("posts")
    .select("id, title, author_id, community:communities!fk_posts_community(slug)")
    .eq("id", postId)
    .maybeSingle();

  if (post?.author_id) {
    await createNotification({
      userId: String(post.author_id),
      actorId: userId,
      type: "comment",
      title: "New comment on your post",
      body: truncate(body, 140),
      href: (post.community as any)?.slug ? `/communities/${String((post.community as any).slug)}` : "/feed",
      metadata: { postId }
    });
  }

  await logAuditEvent({ userId, action: "comment.created", entityType: "comment", entityId: String(comment.id) });
  revalidatePath(path);
  revalidatePath("/feed");
  revalidatePath("/notifications");
}

export async function updateCommentAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const commentId = String(formData.get("comment_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const path = String(formData.get("path") ?? "/feed");

  await enforceCleanContent(userId, "comment_update", body);

  const { data, error } = await client
    .from("comments")
    .update({ body })
    .eq("id", commentId)
    .eq("author_id", userId)
    .select("id")
    .single();

  if (error) throw error;

  await logAuditEvent({ userId, action: "comment.updated", entityType: "comment", entityId: String(data.id) });
  revalidatePath(path);
  revalidatePath("/feed");
}

export async function deleteCommentAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const commentId = String(formData.get("comment_id") ?? "");
  const path = String(formData.get("path") ?? "/feed");

  const { error } = await client.from("comments").delete().eq("id", commentId).eq("author_id", userId);
  if (error) throw error;

  await logAuditEvent({ userId, action: "comment.deleted", entityType: "comment", entityId: commentId });
  revalidatePath(path);
  revalidatePath("/feed");
}

export async function toggleFollowAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const targetUserId = String(formData.get("target_user_id") ?? "");
  const handle = String(formData.get("handle") ?? "");

  const { data: existing, error: existingError } = await client
    .from("follows")
    .select("follower_id")
    .eq("follower_id", userId)
    .eq("following_id", targetUserId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await client.from("follows").delete().eq("follower_id", userId).eq("following_id", targetUserId);
    if (error) throw error;
  } else {
    const { error } = await client.from("follows").insert({ follower_id: userId, following_id: targetUserId });
    if (error) throw error;

    await createNotification({
      userId: targetUserId,
      actorId: userId,
      type: "follow",
      title: "You have a new follower",
      body: "Someone followed your science profile.",
      href: handle ? `/u/${handle}` : "/profile"
    });
  }

  if (handle) revalidatePath(`/u/${handle}`);
  revalidatePath("/notifications");
}

export async function createStudyGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const scheduledFor = String(formData.get("scheduled_for") ?? "") || null;
  const slug = slugify(name);

  await assertActionRateLimit({ userId, action: "study_group.create", limit: 10, windowSeconds: 3600 });
  await enforceCleanContent(userId, "study_group_create", name, description);

  const { data, error } = await client
    .from("study_groups")
    .insert({ name, slug, description, visibility, scheduled_for: scheduledFor })
    .select("id")
    .single();

  if (error) throw error;

  await client.from("study_group_members").upsert({
    study_group_id: data.id,
    user_id: userId,
    role: "owner"
  });

  await logAuditEvent({ userId, action: "study_group.created", entityType: "study_group", entityId: String(data.id) });
  revalidatePath("/groups");
}

export async function updateStudyGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const studyGroupId = String(formData.get("study_group_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const scheduledFor = String(formData.get("scheduled_for") ?? "") || null;
  const slug = slugify(name);

  await enforceCleanContent(userId, "study_group_update", name, description);

  const { data, error } = await client
    .from("study_groups")
    .update({ name, slug, description, visibility, scheduled_for: scheduledFor })
    .eq("id", studyGroupId)
    .eq("owner_id", userId)
    .select("id")
    .single();

  if (error) throw error;

  await logAuditEvent({ userId, action: "study_group.updated", entityType: "study_group", entityId: String(data.id) });
  revalidatePath("/groups");
}

export async function deleteStudyGroupAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const studyGroupId = String(formData.get("study_group_id") ?? "");

  const { error } = await client.from("study_groups").delete().eq("id", studyGroupId).eq("owner_id", userId);
  if (error) throw error;

  await logAuditEvent({ userId, action: "study_group.deleted", entityType: "study_group", entityId: studyGroupId });
  revalidatePath("/groups");
}

export async function toggleStudyGroupMembershipAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const studyGroupId = String(formData.get("study_group_id") ?? "");

  const { data: existing, error: existingError } = await client
    .from("study_group_members")
    .select("study_group_id")
    .eq("study_group_id", studyGroupId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await client.from("study_group_members").delete().eq("study_group_id", studyGroupId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await client.from("study_group_members").insert({ study_group_id: studyGroupId, user_id: userId });
    if (error) throw error;
  }

  revalidatePath("/groups");
}

export async function createConversationAction(formData: FormData) {
  const userId = await requireUserId();
  const admin = createAdminSupabaseClient();
  const recipientHandle = normalizeHandle(String(formData.get("recipient_handle") ?? ""));
  const firstMessage = String(formData.get("first_message") ?? "").trim();

  await assertActionRateLimit({ userId, action: "conversation.create", limit: 10, windowSeconds: 900 });
  await enforceCleanContent(userId, "conversation_create", firstMessage);

  const { data: recipient, error: recipientError } = await admin
    .from("profiles")
    .select("clerk_user_id, display_name, handle")
    .eq("handle", recipientHandle)
    .maybeSingle();

  if (recipientError) throw recipientError;
  if (!recipient || recipient.clerk_user_id === userId) return;

  const { data: existingMemberships } = await admin
    .from("conversation_members")
    .select("conversation_id, user_id")
    .in("user_id", [userId, recipient.clerk_user_id]);

  const counts = new Map<string, Set<string>>();
  for (const membership of existingMemberships ?? []) {
    const set = counts.get(String(membership.conversation_id)) ?? new Set<string>();
    set.add(String(membership.user_id));
    counts.set(String(membership.conversation_id), set);
  }

  for (const [conversationId, members] of counts.entries()) {
    if (members.has(userId) && members.has(String(recipient.clerk_user_id)) && members.size === 2) {
      if (firstMessage) {
        await admin.from("messages").insert({ conversation_id: conversationId, sender_id: userId, body: firstMessage });
      }

      await createNotification({
        userId: String(recipient.clerk_user_id),
        actorId: userId,
        type: "message",
        title: "New direct message",
        body: truncate(firstMessage || "A conversation was opened with you."),
        href: "/messages",
        metadata: { conversationId }
      });

      revalidatePath("/messages");
      revalidatePath("/notifications");
      return;
    }
  }

  const { data: conversation, error: conversationError } = await admin
    .from("conversations")
    .insert({ type: "direct", title: `Chat with ${recipient.display_name}`, created_by: userId })
    .select("id")
    .single();

  if (conversationError) throw conversationError;

  const { error: membersError } = await admin.from("conversation_members").insert([
    { conversation_id: conversation.id, user_id: userId },
    { conversation_id: conversation.id, user_id: recipient.clerk_user_id }
  ]);
  if (membersError) throw membersError;

  if (firstMessage) {
    const { error: messageError } = await admin.from("messages").insert({
      conversation_id: conversation.id,
      sender_id: userId,
      body: firstMessage
    });

    if (messageError) throw messageError;
  }

  await createNotification({
    userId: String(recipient.clerk_user_id),
    actorId: userId,
    type: "message",
    title: "New direct message",
    body: truncate(firstMessage || "A conversation was opened with you."),
    href: "/messages",
    metadata: { conversationId: conversation.id }
  });

  await logAuditEvent({ userId, action: "conversation.created", entityType: "conversation", entityId: String(conversation.id) });
  revalidatePath("/messages");
  revalidatePath("/notifications");
}

export async function sendMessageAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();
  const conversationId = String(formData.get("conversation_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  await assertActionRateLimit({ userId, action: "message.send", limit: 30, windowSeconds: 300 });
  await enforceCleanContent(userId, "message_send", body);

  const { data: message, error } = await client
    .from("messages")
    .insert({ conversation_id: conversationId, body })
    .select("id")
    .single();

  if (error) throw error;

  const { data: members } = await admin.from("conversation_members").select("user_id").eq("conversation_id", conversationId);

  for (const member of members ?? []) {
    const targetUserId = String(member.user_id);
    if (targetUserId !== userId) {
      await createNotification({
        userId: targetUserId,
        actorId: userId,
        type: "message",
        title: "New message",
        body: truncate(body),
        href: "/messages",
        metadata: { conversationId }
      });
    }
  }

  await logAuditEvent({ userId, action: "message.sent", entityType: "message", entityId: String(message.id) });
  revalidatePath("/messages");
  revalidatePath("/notifications");
}

export async function markNotificationReadAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const notificationId = String(formData.get("notification_id") ?? "");

  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId);

  if (error) throw error;
  revalidatePath("/notifications");
}

export async function markAllNotificationsReadAction() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();

  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) throw error;
  revalidatePath("/notifications");
}

export async function reportEntityAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const targetType = String(formData.get("target_type") ?? "");
  const targetId = String(formData.get("target_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const path = String(formData.get("path") ?? "/feed");

  await assertActionRateLimit({ userId, action: "report.create", limit: 20, windowSeconds: 3600 });
  await enforceCleanContent(userId, "report_create", reason, details);

  const { data, error } = await client
    .from("reports")
    .insert({ target_type: targetType, target_id: targetId, reason, details })
    .select("id")
    .single();

  if (error) throw error;

  await logAuditEvent({ userId, action: "report.created", entityType: "report", entityId: String(data.id) });
  revalidatePath(path);
  revalidatePath("/admin");
}

export async function updateReportStatusAction(formData: FormData) {
  const userId = await requireUserId();
  if (!isAdminUser(userId)) {
    redirect("/feed");
  }

  const admin = createAdminSupabaseClient();
  const reportId = String(formData.get("report_id") ?? "");
  const status = String(formData.get("status") ?? "reviewing");
  const notes = String(formData.get("notes") ?? "").trim();

  const { data: report, error: reportError } = await admin
    .from("reports")
    .update({ status })
    .eq("id", reportId)
    .select("id")
    .single();

  if (reportError) throw reportError;

  const { error: actionError } = await admin.from("moderation_actions").insert({
    report_id: report.id,
    moderator_id: userId,
    action: status,
    notes
  });

  if (actionError) throw actionError;

  await logAuditEvent({
    userId,
    action: "report.status_updated",
    entityType: "report",
    entityId: String(report.id),
    metadata: { status, notes }
  });

  revalidatePath("/admin");
}

export async function createCallRoomAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const provider = String(formData.get("provider") ?? "native_mesh");
  const mediaMode = String(formData.get("media_mode") ?? "video");
  const isPrivate = truthy(formData.get("is_private"));
  const scheduledFor = String(formData.get("scheduled_for") ?? "") || null;
  const maxParticipants = Number(String(formData.get("max_participants") ?? "12")) || 12;
  const slugInput = String(formData.get("slug") ?? "").trim();
  const slug = slugify(slugInput || title);
  let meetingNumber = String(formData.get("meeting_number") ?? "").replace(/\s+/g, "");
  let meetingPassword = String(formData.get("meeting_password") ?? "").trim();
  const zoomSessionName = String(formData.get("zoom_session_name") ?? "").trim() || `room-${slug}`;
  const zoomSessionPassword = String(formData.get("zoom_session_password") ?? "").trim() || "science123";

  await assertActionRateLimit({ userId, action: "call_room.create", limit: 15, windowSeconds: 3600 });
  await enforceCleanContent(userId, "call_room_create", title, description);

  if (provider === "zoom_meeting" && !meetingNumber && env.zoomApiAccountId && env.zoomApiClientId && env.zoomApiClientSecret) {
    const managedMeeting = await createManagedZoomMeeting({
      topic: title,
      agenda: description,
      startTime: scheduledFor
    });
    meetingNumber = managedMeeting.meetingNumber;
    meetingPassword = managedMeeting.password;
  }

  if (provider === "zoom_meeting" && meetingNumber && !looksLikeMeetingNumber(meetingNumber)) {
    throw new Error("Zoom meeting numbers should be 9-12 digits.");
  }

  const { data: room, error } = await client
    .from("call_rooms")
    .insert({
      slug,
      title,
      description,
      provider,
      media_mode: mediaMode,
      is_private: isPrivate,
      meeting_number: meetingNumber || null,
      meeting_password: meetingPassword || null,
      zoom_session_name: provider === "zoom_video" ? zoomSessionName : null,
      zoom_session_password: provider === "zoom_video" ? zoomSessionPassword : null,
      scheduled_for: scheduledFor,
      max_participants: maxParticipants
    })
    .select("id, slug")
    .single();

  if (error) throw error;

  await client.from("call_room_members").upsert({
    call_room_id: room.id,
    user_id: userId,
    role: "owner"
  });

  await logAuditEvent({ userId, action: "call_room.created", entityType: "call_room", entityId: String(room.id) });
  revalidatePath("/calls");
  redirect(`/calls/${room.slug}`);
}

export async function toggleCallRoomMembershipAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const callRoomId = String(formData.get("call_room_id") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const { data: existing, error: existingError } = await client
    .from("call_room_members")
    .select("call_room_id")
    .eq("call_room_id", callRoomId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await client.from("call_room_members").delete().eq("call_room_id", callRoomId).eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await client.from("call_room_members").insert({ call_room_id: callRoomId, user_id: userId });
    if (error) throw error;
  }

  revalidatePath("/calls");
  if (slug) revalidatePath(`/calls/${slug}`);
}


export async function completeOnboardingAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();

  const track = String(formData.get("track") ?? "").trim();
  const goals = parseCommaList(String(formData.get("goals") ?? ""));
  const interests = parseCommaList(String(formData.get("interests") ?? ""));
  const experience = String(formData.get("experience") ?? "").trim();

  const { error } = await client.rpc("complete_onboarding", {
    selected_track_input: track,
    goals_input: goals,
    interests_input: interests,
    metadata_input: {
      experience
    }
  });

  if (error) throw error;

  await logAuditEvent({
    action: "onboarding_completed",
    entityType: "profile",
    entityId: userId,
    metadata: {
      track,
      goals,
      interests,
      experience
    }
  });

  revalidatePath("/profile");
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
