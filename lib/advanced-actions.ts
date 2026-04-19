
"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase";
import { createNotificationActionTarget } from "@/lib/notifications";
import { ensureProfile, isAdminUser, requireUserId } from "@/lib/auth";
import { validateTurnstileToken } from "@/lib/turnstile";
import { embedText, hasOpenAI } from "@/lib/openai";
import { slugify, truncate } from "@/lib/utils";

async function requireTurnstile(formData: FormData) {
  const token = String(formData.get("cf_turnstile_token") ?? "");
  const result = await validateTurnstileToken(token);
  if (!result.ok) {
    throw new Error(`Turnstile verification failed: ${result.reason}`);
  }
}

async function bumpReputation(userId: string, delta: number, field?: "contributions" | "helpful_answers" | "mentor_sessions") {
  const admin = createAdminSupabaseClient();
  await admin.from("reputations").upsert({ user_id: userId }, { onConflict: "user_id" });

  await admin.rpc("increment_reputation_field", {
    target_user_id: userId,
    score_delta: delta,
    field_name: field ?? "contributions"
  });
}

async function ensureWallet(userId: string) {
  const admin = createAdminSupabaseClient();
  await admin.from("user_wallets").upsert(
    {
      user_id: userId,
      balance_credits: 100,
      lifetime_earned_credits: 100
    },
    { onConflict: "user_id" }
  );
}

async function addCredits(userId: string, delta: number, reason: string, metadata: Record<string, unknown> = {}) {
  const admin = createAdminSupabaseClient();
  await ensureWallet(userId);

  const { data: wallet, error } = await admin.from("user_wallets").select("*").eq("user_id", userId).single();
  if (error) throw error;

  const nextBalance = Number(wallet.balance_credits ?? 0) + delta;
  if (nextBalance < 0) {
    throw new Error("Insufficient credits.");
  }

  const nextLifetime = delta > 0 ? Number(wallet.lifetime_earned_credits ?? 0) + delta : Number(wallet.lifetime_earned_credits ?? 0);

  const { error: updateError } = await admin
    .from("user_wallets")
    .update({
      balance_credits: nextBalance,
      lifetime_earned_credits: nextLifetime
    })
    .eq("user_id", userId);

  if (updateError) throw updateError;

  await admin.from("credit_transactions").insert({
    user_id: userId,
    delta,
    reason,
    metadata
  });
}

async function indexSearchDocument(input: {
  sourceType: string;
  sourceId: string;
  ownerId?: string | null;
  title: string;
  body: string;
  url?: string;
  visibility?: "public" | "premium" | "private";
  tags?: string[];
}) {
  const admin = createAdminSupabaseClient();
  let embedding: number[] | null = null;

  if (hasOpenAI()) {
    try {
      embedding = await embedText([input.title, input.body, (input.tags ?? []).join(", ")].filter(Boolean).join("\n"));
    } catch (error) {
      console.error("Embedding generation failed", error);
    }
  }

  await admin.from("search_documents").upsert(
    {
      source_type: input.sourceType,
      source_id: input.sourceId,
      owner_id: input.ownerId ?? null,
      title: truncate(input.title, 180),
      body: truncate(input.body, 3000),
      url: input.url ?? "",
      visibility: input.visibility ?? "public",
      tags: input.tags ?? [],
      embedding: embedding ? `[${embedding.join(",")}]` : null
    },
    { onConflict: "source_type,source_id" }
  );
}

export async function upsertWorkspaceProfileAction(formData: FormData) {
  await ensureProfile();
  await requireTurnstile(formData);

  const { orgId } = await auth();
  const userId = await requireUserId();

  if (!orgId) {
    throw new Error("Select or create a Clerk Organization first.");
  }

  const client = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const workspaceType = String(formData.get("workspace_type") ?? "lab");
  const isPublic = String(formData.get("is_public") ?? "false") === "true";

  const { data, error } = await client
    .from("workspace_profiles")
    .upsert(
      {
        clerk_org_id: orgId,
        owner_id: userId,
        name,
        slug: slugify(name || orgId),
        description,
        workspace_type: workspaceType,
        is_public: isPublic
      },
      { onConflict: "clerk_org_id" }
    )
    .select("*")
    .single();

  if (error) throw error;

  await indexSearchDocument({
    sourceType: "workspace",
    sourceId: String(data.id),
    ownerId: userId,
    title: name,
    body: description,
    url: "/workspaces",
    visibility: isPublic ? "public" : "private"
  });

  revalidatePath("/workspaces");
}

export async function createResearchClubAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const workspaceId = String(formData.get("workspace_id") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cadence = String(formData.get("cadence") ?? "weekly");
  const paperTitle = String(formData.get("paper_title") ?? "").trim();
  const paperUrl = String(formData.get("paper_url") ?? "").trim();
  const scheduledFor = String(formData.get("scheduled_for") ?? "") || null;

  const { data: club, error } = await client
    .from("research_clubs")
    .insert({
      workspace_id: workspaceId,
      title,
      slug: slugify(title),
      description,
      cadence,
      owner_id: userId
    })
    .select("*")
    .single();

  if (error) throw error;

  if (paperTitle) {
    await client.from("paper_sessions").insert({
      research_club_id: club.id,
      title: `${paperTitle} discussion`,
      paper_title: paperTitle,
      paper_url: paperUrl,
      scheduled_for: scheduledFor
    });
  }

  await bumpReputation(userId, 5, "contributions");
  await indexSearchDocument({
    sourceType: "research_club",
    sourceId: String(club.id),
    ownerId: userId,
    title,
    body: description,
    url: "/labs"
  });

  revalidatePath("/labs");
}

export async function createLabProjectAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const workspaceId = String(formData.get("workspace_id") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const status = String(formData.get("status") ?? "planning");

  const { data, error } = await client
    .from("lab_projects")
    .insert({
      workspace_id: workspaceId,
      title,
      slug: slugify(title),
      summary,
      status,
      owner_id: userId
    })
    .select("*")
    .single();

  if (error) throw error;

  await bumpReputation(userId, 8, "contributions");
  await indexSearchDocument({
    sourceType: "lab_project",
    sourceId: String(data.id),
    ownerId: userId,
    title,
    body: summary,
    url: "/labs"
  });

  revalidatePath("/labs");
}

export async function createLabNotebookEntryAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const projectId = String(formData.get("lab_project_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "team");

  const { data, error } = await client
    .from("lab_notebooks")
    .insert({
      lab_project_id: projectId,
      title,
      body,
      visibility,
      author_id: userId
    })
    .select("*")
    .single();

  if (error) throw error;

  await bumpReputation(userId, 3, "contributions");
  await indexSearchDocument({
    sourceType: "lab_notebook",
    sourceId: String(data.id),
    ownerId: userId,
    title,
    body,
    url: "/labs",
    visibility: visibility === "public" ? "public" : "private"
  });

  revalidatePath("/labs");
}

export async function createVaultItemAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const contentMarkdown = String(formData.get("content_markdown") ?? "").trim();
  const sourceUrl = String(formData.get("source_url") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const premiumOnly = String(formData.get("premium_only") ?? "") === "true";
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const { data, error } = await client
    .from("resource_vault_items")
    .insert({
      owner_id: userId,
      title,
      slug: slugify(title),
      description,
      content_markdown: contentMarkdown,
      source_url: sourceUrl,
      visibility,
      premium_only: premiumOnly,
      tags
    })
    .select("*")
    .single();

  if (error) throw error;

  await bumpReputation(userId, 4, "contributions");
  await indexSearchDocument({
    sourceType: "vault_item",
    sourceId: String(data.id),
    ownerId: userId,
    title,
    body: `${description}\n\n${contentMarkdown}`,
    url: "/vault",
    visibility: visibility as "public" | "premium" | "private",
    tags
  });

  revalidatePath("/vault");
}

export async function createQuestionBountyAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const rewardCredits = Number(formData.get("reward_credits") ?? 25);
  const closesAt = String(formData.get("closes_at") ?? "") || null;
  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  await addCredits(userId, -rewardCredits, "bounty_created", { title });

  const { data, error } = await client
    .from("question_bounties")
    .insert({
      author_id: userId,
      title,
      body,
      reward_credits: rewardCredits,
      closes_at: closesAt,
      tags
    })
    .select("*")
    .single();

  if (error) throw error;

  await indexSearchDocument({
    sourceType: "bounty",
    sourceId: String(data.id),
    ownerId: userId,
    title,
    body,
    url: "/bounties",
    tags
  });

  revalidatePath("/bounties");
}

export async function createBountyResponseAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const bountyId = String(formData.get("bounty_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  const { error } = await client.from("bounty_responses").insert({
    bounty_id: bountyId,
    author_id: userId,
    body
  });

  if (error) throw error;

  const admin = createAdminSupabaseClient();
  const { data: bounty } = await admin.from("question_bounties").select("author_id").eq("id", bountyId).single();

  if (bounty?.author_id) {
    await createNotificationActionTarget({
      userId: String(bounty.author_id),
      actorId: userId,
      type: "system",
      title: "New bounty answer",
      body: truncate(body, 120)
    });
  }

  await bumpReputation(userId, 6, "helpful_answers");
  revalidatePath("/bounties");
}

export async function acceptBountyResponseAction(formData: FormData) {
  const userId = await requireUserId();
  const admin = createAdminSupabaseClient();
  const bountyId = String(formData.get("bounty_id") ?? "");
  const responseId = String(formData.get("response_id") ?? "");

  const { data: bounty, error: bountyError } = await admin.from("question_bounties").select("*").eq("id", bountyId).single();
  if (bountyError) throw bountyError;

  if (String(bounty.author_id) !== userId) {
    throw new Error("Only the bounty author can accept a response.");
  }

  const { data: responseRow, error: responseError } = await admin
    .from("bounty_responses")
    .select("*")
    .eq("id", responseId)
    .eq("bounty_id", bountyId)
    .single();

  if (responseError) throw responseError;

  await admin.from("question_bounties").update({
    status: "awarded",
    accepted_answer_id: responseId
  }).eq("id", bountyId);

  await addCredits(String(responseRow.author_id), Number(bounty.reward_credits ?? 0), "bounty_awarded", { bountyId });
  await bumpReputation(String(responseRow.author_id), 12, "helpful_answers");
  await createNotificationActionTarget({
    userId: String(responseRow.author_id),
    actorId: userId,
    type: "system",
    title: "Bounty awarded",
    body: `You earned ${bounty.reward_credits} credits.`
  });

  revalidatePath("/bounties");
}

export async function createEventAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const eventType = String(formData.get("event_type") ?? "study_session");
  const scheduledFor = String(formData.get("scheduled_for") ?? "");
  const endsAt = String(formData.get("ends_at") ?? "") || null;
  const virtualUrl = String(formData.get("virtual_url") ?? "").trim();
  const workspaceId = String(formData.get("workspace_id") ?? "") || null;
  const premiumOnly = String(formData.get("premium_only") ?? "") === "true";

  const { data, error } = await client
    .from("events")
    .insert({
      organizer_id: userId,
      workspace_id: workspaceId,
      title,
      slug: slugify(title),
      description,
      event_type: eventType,
      scheduled_for: scheduledFor,
      ends_at: endsAt,
      virtual_url: virtualUrl,
      premium_only: premiumOnly
    })
    .select("*")
    .single();

  if (error) throw error;

  await indexSearchDocument({
    sourceType: "event",
    sourceId: String(data.id),
    ownerId: userId,
    title,
    body: description,
    url: "/events",
    visibility: premiumOnly ? "premium" : "public"
  });

  revalidatePath("/events");
}

export async function registerForEventAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const eventId = String(formData.get("event_id") ?? "");

  const { error } = await client.from("event_registrations").upsert(
    {
      event_id: eventId,
      user_id: userId,
      status: "registered"
    },
    { onConflict: "event_id,user_id" }
  );

  if (error) throw error;
  revalidatePath("/events");
}

export async function createCampusChapterAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const name = String(formData.get("name") ?? "").trim();
  const campusName = String(formData.get("campus_name") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  const { data, error } = await client
    .from("campus_chapters")
    .insert({
      name,
      slug: slugify(`${campusName}-${name}`),
      campus_name: campusName,
      region,
      description,
      lead_user_id: userId
    })
    .select("*")
    .single();

  if (error) throw error;

  await client.from("chapter_members").upsert(
    {
      chapter_id: data.id,
      user_id: userId,
      role: "owner"
    },
    { onConflict: "chapter_id,user_id" }
  );

  await bumpReputation(userId, 10, "contributions");
  revalidatePath("/ambassadors");
}

export async function joinCampusChapterAction(formData: FormData) {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const chapterId = String(formData.get("chapter_id") ?? "");

  const { error } = await client.from("chapter_members").upsert(
    {
      chapter_id: chapterId,
      user_id: userId,
      role: "member"
    },
    { onConflict: "chapter_id,user_id" }
  );

  if (error) throw error;
  revalidatePath("/ambassadors");
}

export async function createVerificationRequestAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const verificationType = String(formData.get("verification_type") ?? "expert");
  const note = String(formData.get("note") ?? "").trim();
  const evidenceUrl = String(formData.get("evidence_url") ?? "").trim();

  const { error } = await client.from("verification_requests").insert({
    user_id: userId,
    verification_type: verificationType,
    note,
    evidence_url: evidenceUrl
  });

  if (error) throw error;
  revalidatePath("/experts");
  redirect("/experts?requested=1");
}

export async function createCallRecordingAction(formData: FormData) {
  await requireTurnstile(formData);
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const callRoomId = String(formData.get("call_room_id") ?? "") || null;
  const title = String(formData.get("title") ?? "").trim();
  const transcriptText = String(formData.get("transcript_text") ?? "").trim();
  const provider = String(formData.get("provider") ?? "native_mesh");
  const externalRecordingId = String(formData.get("external_recording_id") ?? "").trim();
  const isPublic = String(formData.get("is_public") ?? "") === "true";

  const { data, error } = await client
    .from("call_recordings")
    .insert({
      call_room_id: callRoomId,
      title,
      provider,
      external_recording_id: externalRecordingId,
      transcript_text: transcriptText,
      created_by: userId,
      is_public: isPublic,
      transcript_status: transcriptText ? "ready" : "pending"
    })
    .select("*")
    .single();

  if (error) throw error;

  if (transcriptText) {
    await indexSearchDocument({
      sourceType: "recording",
      sourceId: String(data.id),
      ownerId: userId,
      title,
      body: transcriptText,
      url: "/recordings",
      visibility: isPublic ? "public" : "private"
    });
  }

  revalidatePath("/recordings");
}

export async function syncSearchIndexAction() {
  const userId = await requireUserId();
  const client = await createServerSupabaseClient();
  const admin = createAdminSupabaseClient();

  const [posts, vaultItems, notebooks, bounties, events] = await Promise.all([
    client.from("posts").select("id, title, body, author_id, tags").eq("author_id", userId).limit(50),
    client.from("resource_vault_items").select("id, title, description, content_markdown, owner_id, visibility, tags").eq("owner_id", userId).limit(50),
    client.from("lab_notebooks").select("id, title, body, author_id, visibility").eq("author_id", userId).limit(50),
    client.from("question_bounties").select("id, title, body, author_id, tags").eq("author_id", userId).limit(50),
    client.from("events").select("id, title, description, organizer_id, premium_only").eq("organizer_id", userId).limit(50)
  ]);

  for (const post of posts.data ?? []) {
    await indexSearchDocument({
      sourceType: "post",
      sourceId: String(post.id),
      ownerId: String(post.author_id),
      title: String(post.title),
      body: String(post.body),
      url: "/feed",
      tags: (post.tags ?? []) as string[]
    });
  }

  for (const item of vaultItems.data ?? []) {
    await indexSearchDocument({
      sourceType: "vault_item",
      sourceId: String(item.id),
      ownerId: String(item.owner_id),
      title: String(item.title),
      body: `${String(item.description ?? "")}\n\n${String(item.content_markdown ?? "")}`,
      url: "/vault",
      visibility: String(item.visibility ?? "public") as "public" | "premium" | "private",
      tags: (item.tags ?? []) as string[]
    });
  }

  for (const notebook of notebooks.data ?? []) {
    await indexSearchDocument({
      sourceType: "lab_notebook",
      sourceId: String(notebook.id),
      ownerId: String(notebook.author_id),
      title: String(notebook.title),
      body: String(notebook.body),
      url: "/labs",
      visibility: String(notebook.visibility ?? "private") === "public" ? "public" : "private"
    });
  }

  for (const bounty of bounties.data ?? []) {
    await indexSearchDocument({
      sourceType: "bounty",
      sourceId: String(bounty.id),
      ownerId: String(bounty.author_id),
      title: String(bounty.title),
      body: String(bounty.body),
      url: "/bounties",
      tags: (bounty.tags ?? []) as string[]
    });
  }

  for (const event of events.data ?? []) {
    await indexSearchDocument({
      sourceType: "event",
      sourceId: String(event.id),
      ownerId: String(event.organizer_id),
      title: String(event.title),
      body: String(event.description),
      url: "/events",
      visibility: event.premium_only ? "premium" : "public"
    });
  }

  await admin.from("audit_logs").insert({
    actor_id: userId,
    action: "search_index_synced",
    entity_type: "search_documents",
    entity_id: userId,
    metadata: { initiated_by: userId }
  });

  revalidatePath("/search");
}

export async function reviewVerificationRequestAction(formData: FormData) {
  const userId = await requireUserId();
  if (!isAdminUser(userId)) {
    throw new Error("Admin access required.");
  }

  const admin = createAdminSupabaseClient();
  const requestId = String(formData.get("request_id") ?? "");
  const decision = String(formData.get("decision") ?? "approved");
  const { data, error } = await admin
    .from("verification_requests")
    .update({
      status: decision,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString()
    })
    .eq("id", requestId)
    .select("*")
    .single();

  if (error) throw error;

  if (decision === "approved") {
    await admin.from("reputations").upsert({ user_id: data.user_id, verified_expert: true }, { onConflict: "user_id" });
    await admin.rpc("increment_reputation_field", {
      target_user_id: data.user_id,
      score_delta: 25,
      field_name: "mentor_sessions"
    });
  }

  revalidatePath("/admin");
  revalidatePath("/experts");
}
