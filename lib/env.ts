function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function splitCsv(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  siteName: process.env.NEXT_PUBLIC_SITE_NAME ?? "Science Platform",
  clerkWebhookSecret: process.env.CLERK_WEBHOOK_SIGNING_SECRET ?? "",
  clerkSecretKey: process.env.CLERK_SECRET_KEY ?? "",
  clerkJwtKey: process.env.CLERK_JWT_KEY ?? "",
  clerkAuthorizedParties: splitCsv(process.env.CLERK_AUTHORIZED_PARTIES),
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeStarterPriceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  stripeProPriceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
  stripeTeamPriceId: process.env.STRIPE_TEAM_PRICE_ID ?? "",
  stripePortalConfigurationId: process.env.STRIPE_CUSTOMER_PORTAL_CONFIGURATION_ID ?? "",
  adminUserIds: splitCsv(process.env.ADMIN_USER_IDS),
  moderationBlockedTerms: splitCsv(process.env.MODERATION_BLOCKED_TERMS ?? "buy essay,telegram premium,whatsapp me").map((value) =>
    value.toLowerCase()
  ),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL"),
  supabasePublishableKey: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseUploadsBucket: process.env.SUPABASE_UPLOADS_BUCKET ?? "science-platform-assets",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "",
  turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY ?? "",
  openAiApiKey: process.env.OPENAI_API_KEY ?? "",
  openAiStudyModel: process.env.OPENAI_STUDY_MODEL ?? "gpt-5.4-mini",
  openAiEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",

  livekitUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL ?? "",
  livekitServerUrl: process.env.LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? "",
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? "",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "",
  livekitWebhookKey: process.env.LIVEKIT_WEBHOOK_KEY ?? "",
  livekitDefaultRoomPreset: process.env.LIVEKIT_DEFAULT_ROOM_PRESET ?? "group_call",
  livekitR2Bucket: process.env.LIVEKIT_R2_BUCKET ?? process.env.R2_BUCKET ?? "",
  zoomMeetingSdkKey: process.env.ZOOM_MEETING_SDK_KEY ?? "",
  zoomMeetingSdkSecret: process.env.ZOOM_MEETING_SDK_SECRET ?? "",
  zoomVideoSdkKey: process.env.ZOOM_VIDEO_SDK_KEY ?? "",
  zoomVideoSdkSecret: process.env.ZOOM_VIDEO_SDK_SECRET ?? "",
  zoomApiAccountId: process.env.ZOOM_API_ACCOUNT_ID ?? "",
  zoomApiClientId: process.env.ZOOM_API_CLIENT_ID ?? "",
  zoomApiClientSecret: process.env.ZOOM_API_CLIENT_SECRET ?? "",
  jobsDispatchSecret: process.env.JOBS_DISPATCH_SECRET ?? "",
  analyticsWriteKey: process.env.ANALYTICS_WRITE_KEY ?? "",
  rateLimitSalt: process.env.RATE_LIMIT_SALT ?? "local-dev-salt",
  supportEmail: process.env.SUPPORT_EMAIL ?? "support@example.com",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "Science Platform <noreply@example.com>",
  sentryDsn: process.env.SENTRY_DSN ?? "",
  sentryAuthToken: process.env.SENTRY_AUTH_TOKEN ?? "",
  sentryOrg: process.env.SENTRY_ORG ?? "",
  sentryProject: process.env.SENTRY_PROJECT ?? "",
  mobileSentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  r2Endpoint: process.env.R2_ENDPOINT ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  backupRetentionDays: Number(process.env.BACKUP_RETENTION_DAYS ?? 14),
  backupDbUrl: process.env.SUPABASE_DB_URL ?? "",
  backupOutputDir: process.env.BACKUP_OUTPUT_DIR ?? "backups",
  mobileApiUrl: process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000",
  mobileLivekitUrl: process.env.EXPO_PUBLIC_LIVEKIT_URL ?? process.env.NEXT_PUBLIC_LIVEKIT_URL ?? process.env.LIVEKIT_URL ?? "",
  mobileClerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  expoAccessToken: process.env.EXPO_ACCESS_TOKEN ?? "",
  expoProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  googleCalendarScopes: splitCsv(process.env.GOOGLE_CALENDAR_SCOPES ?? "https://www.googleapis.com/auth/calendar.events,openid,email,profile"),
  auditExportRetentionDays: Number(process.env.AUDIT_EXPORT_RETENTION_DAYS ?? 7)
,
  webrtcStunUrls: splitCsv(process.env.WEBRTC_STUN_URLS ?? process.env.EXPO_PUBLIC_WEBRTC_STUN_URLS ?? "stun:stun.l.google.com:19302"),
  webrtcTurnUrl: process.env.WEBRTC_TURN_URL ?? process.env.EXPO_PUBLIC_WEBRTC_TURN_URL ?? "",
  webrtcTurnUsername: process.env.WEBRTC_TURN_USERNAME ?? process.env.EXPO_PUBLIC_WEBRTC_TURN_USERNAME ?? "",
  webrtcTurnCredential: process.env.WEBRTC_TURN_CREDENTIAL ?? process.env.EXPO_PUBLIC_WEBRTC_TURN_CREDENTIAL ?? "",
  demoModeEnabled: (process.env.NEXT_PUBLIC_DEMO_MODE ?? process.env.EXPO_PUBLIC_DEMO_MODE ?? "true") === "true"
};
