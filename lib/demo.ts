
import { createAdminSupabaseClient, createPublicSupabaseClient } from "@/lib/supabase";
import { env } from "@/lib/env";

export async function getDemoScenarios() {
  try {
    const client = env.supabaseServiceRoleKey ? createAdminSupabaseClient() : createPublicSupabaseClient();
    const { data, error } = await client.from("demo_scenarios").select("*").order("key");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [
      {
        key: "student_launch",
        title: "STEM study network",
        summary: "Communities, study groups, AI, calls, and premium learning workflows.",
        cta_href: "/demo",
        metrics: { communityCount: 12, weeklyPosts: 1480, avgStudyHours: 6.2, nps: 58 },
        highlights: [
          "Physics, biology, chemistry, astronomy, engineering, and mathematics communities",
          "Group calls, notes, semantic search, and AI study help",
          "Premium tiers for power users, labs, and institutions"
        ]
      },
      {
        key: "investor_mode",
        title: "Investor walkthrough",
        summary: "A guided narrative for demos, screenshots, and pitch meetings.",
        cta_href: "/demo/investor",
        metrics: { waitlist: 9400, paidConversion: 0.071, campusLeads: 28, retention30d: 0.42 },
        highlights: [
          "One-click product tour with seeded content",
          "Clear monetization story across Starter, Pro, and Institution",
          "Operations, compliance, and collaboration surfaces included"
        ]
      }
    ];
  }
}

export async function getInvestorDemoSnapshot() {
  try {
    const admin = env.supabaseServiceRoleKey ? createAdminSupabaseClient() : createPublicSupabaseClient();
    const [communities, posts, groups, subscriptions, workspaces, events, bounties] = await Promise.all([
      admin.from("communities").select("id", { count: "exact", head: true }),
      admin.from("posts").select("id", { count: "exact", head: true }),
      admin.from("study_groups").select("id", { count: "exact", head: true }),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
      admin.from("workspace_profiles").select("id", { count: "exact", head: true }),
      admin.from("events").select("id", { count: "exact", head: true }),
      admin.from("question_bounties").select("id", { count: "exact", head: true })
    ]);

    return {
      metrics: [
        { label: "Communities", value: communities.count ?? 0 },
        { label: "Posts", value: posts.count ?? 0 },
        { label: "Study groups", value: groups.count ?? 0 },
        { label: "Active subscriptions", value: subscriptions.count ?? 0 },
        { label: "Workspaces", value: workspaces.count ?? 0 },
        { label: "Events", value: events.count ?? 0 },
        { label: "Bounties", value: bounties.count ?? 0 }
      ],
      story: [
        "Acquire STEM learners with campus ambassadors and creator-led communities.",
        "Retain them through study groups, AI help, semantic search, and live calls.",
        "Monetize with Starter, Pro, and Institution plans plus tutoring, events, and credits."
      ]
    };
  } catch {
    return {
      metrics: [
        { label: "Communities", value: 12 },
        { label: "Posts", value: 1480 },
        { label: "Study groups", value: 84 },
        { label: "Active subscriptions", value: 132 },
        { label: "Workspaces", value: 9 },
        { label: "Events", value: 26 },
        { label: "Bounties", value: 18 }
      ],
      story: [
        "Acquire STEM learners with campus ambassadors and creator-led communities.",
        "Retain them through study groups, AI help, semantic search, and live calls.",
        "Monetize with Starter, Pro, and Institution plans plus tutoring, events, and credits."
      ]
    };
  }
}


export async function getDemoShowcaseCards(audience?: string | null) {
  try {
    const admin = env.supabaseServiceRoleKey ? createAdminSupabaseClient() : createPublicSupabaseClient();
    let query = admin.from("demo_showcase_cards").select("*").order("position");
    if (audience) {
      query = query.or(`audience.eq.${audience},audience.eq.general`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch {
    return [
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
      }
    ];
  }
}
