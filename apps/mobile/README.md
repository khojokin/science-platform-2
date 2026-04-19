# Science Platform Mobile (Expo)

This is the v6 mobile companion app.

## Stack

- Expo + Expo Router
- Clerk Expo auth with Secure Store token cache
- Bearer-token requests into `/api/mobile/*`
- Optional Sentry React Native instrumentation

## Setup

1. Copy `.env.example` to `.env`
2. Fill:
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `EXPO_PUBLIC_SENTRY_DSN` (optional)
3. Install:
   - `npm install`
4. Run:
   - `npm run dev`

## Current tabs

- Feed
- Communities
- Inbox
- AI
- Profile

## Important

The mobile app uses Clerk bearer tokens and expects the web backend to verify them with `CLERK_SECRET_KEY` and optionally `CLERK_JWT_KEY`.


## v7 additions

- Expo push notification registration with `expo-notifications`
- `eas.json` build profiles for development / preview / production
- Mobile call launcher screen
- Mobile calendar screen
- Alerts screen for device registration

## Extra env

- `EXPO_PUBLIC_EAS_PROJECT_ID`


## v8 additions

- Native mobile call room screen with `react-native-webrtc`
- SQLite-backed offline query cache and queued post mutations
- Push delivery receipt viewer
- Mobile onboarding screen
- Demo mode entry screen
