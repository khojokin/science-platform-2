import { Resend } from "resend";
import { env } from "@/lib/env";
import { createAdminSupabaseClient } from "@/lib/supabase";

export type TransactionalEmailTemplate =
  | "welcome"
  | "workspace_invite"
  | "bounty_awarded"
  | "event_reminder"
  | "moderation_update"
  | "backup_completed";

function getResend() {
  if (!env.resendApiKey) {
    throw new Error("Resend is not configured.");
  }

  return new Resend(env.resendApiKey);
}

function wrapTemplate(title: string, intro: string, body: string, ctaLabel?: string, ctaUrl?: string) {
  const button = ctaLabel && ctaUrl
    ? `<p style="margin:24px 0;"><a href="${ctaUrl}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:600;">${ctaLabel}</a></p>`
    : "";

  return `
    <div style="font-family:Inter,Arial,sans-serif;background:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:20px;padding:32px;border:1px solid #e5e7eb;">
        <p style="font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;margin:0 0 12px;">${env.siteName}</p>
        <h1 style="font-size:28px;line-height:1.2;margin:0 0 12px;color:#0f172a;">${title}</h1>
        <p style="font-size:16px;line-height:1.7;color:#334155;margin:0 0 16px;">${intro}</p>
        <div style="font-size:15px;line-height:1.7;color:#334155;">${body}</div>
        ${button}
        <p style="margin-top:24px;font-size:13px;color:#64748b;">Need help? Reply to ${env.supportEmail}.</p>
      </div>
    </div>
  `.trim();
}

export function renderTransactionalEmail(input: {
  template: TransactionalEmailTemplate;
  headline?: string;
  recipientName?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  context?: Record<string, unknown>;
}) {
  const name = input.recipientName ? ` ${input.recipientName}` : "";
  const context = input.context ?? {};

  switch (input.template) {
    case "welcome":
      return {
        subject: `Welcome to ${env.siteName}`,
        html: wrapTemplate(
          input.headline ?? `Welcome${name}`,
          "Your science workspace is ready.",
          `<p>Start by joining communities, creating a study group, and filling out your profile so people can find your interests.</p>`,
          input.ctaLabel ?? "Open dashboard",
          input.ctaUrl ?? `${env.appUrl}/dashboard`
        )
      };
    case "workspace_invite":
      return {
        subject: input.headline ?? "You were invited to a workspace",
        html: wrapTemplate(
          "Workspace invite",
          `You have been invited${name ? `,${name.trim()}` : ""} to collaborate in a private science workspace.`,
          `<p>Workspace: <strong>${String(context.workspaceName ?? "Science Workspace")}</strong></p>`,
          input.ctaLabel ?? "Open workspace",
          input.ctaUrl ?? `${env.appUrl}/workspaces`
        )
      };
    case "bounty_awarded":
      return {
        subject: input.headline ?? "Your bounty has a winner",
        html: wrapTemplate(
          "Bounty awarded",
          "A question bounty changed state.",
          `<p>${String(context.summary ?? "Review the bounty and payout details in your dashboard.")}</p>`,
          input.ctaLabel ?? "Open bounties",
          input.ctaUrl ?? `${env.appUrl}/bounties`
        )
      };
    case "event_reminder":
      return {
        subject: input.headline ?? "Upcoming science event reminder",
        html: wrapTemplate(
          "Event reminder",
          "One of your sessions starts soon.",
          `<p>${String(context.summary ?? "Open the event page for the final details, room link, and resources.")}</p>`,
          input.ctaLabel ?? "Open event",
          input.ctaUrl ?? `${env.appUrl}/events`
        )
      };
    case "moderation_update":
      return {
        subject: input.headline ?? "A moderation update is ready",
        html: wrapTemplate(
          "Moderation update",
          "A report or appeal changed status.",
          `<p>${String(context.summary ?? "Review the case details in your notifications.")}</p>`,
          input.ctaLabel ?? "Open notifications",
          input.ctaUrl ?? `${env.appUrl}/notifications`
        )
      };
    case "backup_completed":
      return {
        subject: input.headline ?? "Nightly backup completed",
        html: wrapTemplate(
          "Backup complete",
          "A fresh database backup finished successfully.",
          `<p>${String(context.summary ?? "Review the latest backup manifest in your operations console.")}</p>`,
          input.ctaLabel ?? "Open operations",
          input.ctaUrl ?? `${env.appUrl}/ops`
        )
      };
    default:
      return {
        subject: `${env.siteName} update`,
        html: wrapTemplate("Platform update", "There is a new update in your account.", "<p>Open the platform to continue.</p>")
      };
  }
}

export async function sendTransactionalEmail(input: {
  to: string;
  template: TransactionalEmailTemplate;
  headline?: string;
  recipientName?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  context?: Record<string, unknown>;
  userId?: string | null;
}) {
  const resend = getResend();
  const rendered = renderTransactionalEmail(input);
  const result = await resend.emails.send({
    from: env.resendFromEmail,
    to: input.to,
    subject: rendered.subject,
    html: rendered.html
  });

  const admin = createAdminSupabaseClient();
  await admin.from("email_deliveries").insert({
    user_id: input.userId ?? null,
    recipient_email: input.to,
    template_key: input.template,
    subject: rendered.subject,
    provider: "resend",
    provider_message_id: typeof result.data?.id === "string" ? result.data.id : null,
    status: result.error ? "failed" : "sent",
    metadata: {
      headline: input.headline ?? null,
      context: input.context ?? {}
    }
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}
