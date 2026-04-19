# Science Platform MVP v9

A science-first community and collaboration platform built with **Next.js + Clerk + Supabase + Stripe + Cloudflare Workers/OpenNext**, now expanded with:

- Clerk Organization-backed workspaces
- semantic search with `pgvector`
- AI study copilot scaffolding via the OpenAI Responses API
- research clubs, lab projects, and searchable notebook entries
- resource vault
- question bounties with credit wallets
- events and registrations
- verified expert requests + reputation leaderboard
- campus chapters / ambassadors
- recordings + transcript indexing
- Turnstile anti-spam scaffolding
- Zoom Meeting SDK / Video SDK + native browser calls
- mobile companion app with Expo Router + Clerk Expo
- email delivery scaffolding with Resend
- Sentry observability scaffolding
- R2-backed backup/object processing utilities
- GitHub Actions CI/CD and nightly backups

## Stack

- **Frontend/App**: Next.js App Router
- **Auth / Organizations**: Clerk
- **Database / Storage / Realtime**: Supabase
- **Billing**: Stripe
- **Bot protection**: Cloudflare Turnstile
- **Hosting**: Cloudflare Workers via OpenNext
- **AI**: OpenAI API
- **Calls**: Native browser WebRTC + Zoom SDKs
- **Email**: Resend
- **Observability**: Sentry
- **Object/archive storage**: Cloudflare R2
- **Mobile**: Expo + Expo Router + Clerk Expo

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill Clerk, Supabase, Stripe, Turnstile, OpenAI, Zoom, Resend, Sentry, and R2 values
3. Apply SQL files in order:
   - `sql/001_schema.sql`
   - `sql/002_realtime_notifications_storage.sql`
   - `sql/003_seed_demo.sql`
   - `sql/004_advanced_calls_security.sql`
   - `sql/005_platform_intelligence_workspaces.sql`
   - `sql/006_seed_advanced_demo.sql`
   - `sql/007_operations_hardening_polish.sql`
   - `sql/008_mobile_infra_email_backups.sql`
   - `sql/009_mobile_calendar_reliability.sql`
   - `sql/010_v8_mobile_demo_polish.sql`
   - `sql/011_v9_livekit_sfu_demo.sql`
4. Install and run:
   - `npm install`
   - `npm run dev`

## Mobile app

The Expo client lives in `apps/mobile`.

1. `cd apps/mobile`
2. copy `.env.example` to `.env`
3. `npm install`
4. `npm run dev`

The mobile client talks to these authenticated REST endpoints:

- `/api/mobile/feed`
- `/api/mobile/communities`
- `/api/mobile/me`
- `/api/mobile/notifications`
- `/api/mobile/messages`
- `/api/mobile/posts`
- `/api/mobile/search`
- `/api/mobile/ai`

## Operations additions in v6

- queued transactional emails via Resend
- Sentry config files for browser, server, and edge runtimes
- R2 upload helpers for archived objects/backups
- Supabase backup script and upload-to-R2 helper
- GitHub Actions workflows for CI, deploy, and nightly backups
- health check route at `/api/health`

## Backup flow

- `bash scripts/backup-supabase.sh`
- optional upload with `node scripts/upload-backup-to-r2.mjs <archive.gz>`
- nightly workflow in `.github/workflows/backup.yml`

## What v6 still does not solve completely

- verified green builds for every newly added dependency
- production EAS setup and store submissions for the mobile client
- full media transcoding pipeline for large recordings
- push notifications for Expo clients
- automated secret rotation and full disaster-recovery rehearsal


## v7 additions

- Mobile push notification registration and Expo push fanout scaffolding
- `apps/mobile/eas.json` for EAS build profiles
- Google Calendar OAuth + event sync scaffolding
- Ops reliability page with restore drill queueing
- Ops security page with secret rotation logs and audit export requests
- Background job support for push, calendar sync, audit exports, restore drills, and secret rotation follow-up

## Apply next SQL

Run `sql/009_mobile_calendar_reliability.sql` after the existing migrations.


## v8 additions

- Native mobile call signaling scaffold with `react-native-webrtc`
- Expo push receipt polling and persisted delivery receipts
- SQLite-backed offline cache + queued mobile mutations
- Web onboarding flow and onboarding progress table
- Public demo mode and investor walkthrough pages
- Landing-page and app-shell polish for a cleaner demo story

### Apply the new migration

- `sql/010_v8_mobile_demo_polish.sql`

### New environment variables

- `WEBRTC_STUN_URLS`
- `WEBRTC_TURN_URL`
- `WEBRTC_TURN_USERNAME`
- `WEBRTC_TURN_CREDENTIAL`
- `NEXT_PUBLIC_DEMO_MODE`
- mobile equivalents in `apps/mobile/.env.example`


## v9 additions

- Production-grade SFU call scaffolding with LiveKit for web and mobile
- LiveKit token endpoint, webhook ingestion, room session sync, and recording-export scaffolding
- LiveKit-backed recording export rows for MP4/HLS/archive workflows
- Mobile deep-link and push-navigation handling for calls, messages, events, recordings, and demo routes
- Demo presentation mode with seeded showcase cards for investor, campus, and institution walkthroughs
- Optional seeded demo personas, communities, events, workspaces, and recordings in `sql/011_v9_livekit_sfu_demo.sql`

## Apply next SQL

Run `sql/011_v9_livekit_sfu_demo.sql` after the existing migrations.

## New environment variables

- `NEXT_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_URL`
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `LIVEKIT_WEBHOOK_KEY`
- `EXPO_PUBLIC_LIVEKIT_URL`
- `LIVEKIT_R2_BUCKET`

## New routes

- `POST /api/livekit/token`
- `POST /api/livekit/webhook`
- `POST /api/livekit/egress/start`
- `POST /api/livekit/egress/stop`
- `GET /demo/presentation`
