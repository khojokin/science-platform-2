create extension if not exists pgcrypto;

create table if not exists mobile_push_devices (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(clerk_user_id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null default 'unknown',
  device_name text,
  app_build text,
  push_enabled boolean not null default true,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists push_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id text references profiles(clerk_user_id) on delete set null,
  device_id uuid references mobile_push_devices(id) on delete set null,
  provider text not null default 'expo',
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  provider_ticket_id text,
  provider_response jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(clerk_user_id) on delete cascade,
  provider text not null default 'google',
  external_account_id text,
  access_token text,
  refresh_token text,
  scope text[] not null default '{}'::text[],
  token_expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists calendar_connections_user_provider_idx
  on calendar_connections(user_id, provider);

create table if not exists synced_calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(clerk_user_id) on delete cascade,
  connection_id uuid references calendar_connections(id) on delete set null,
  provider text not null default 'google',
  source_type text not null,
  source_id text not null,
  external_event_id text,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  join_url text,
  status text not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists synced_calendar_events_source_idx
  on synced_calendar_events(user_id, provider, source_type, source_id);

create table if not exists restore_drills (
  id uuid primary key default gen_random_uuid(),
  requested_by text references profiles(clerk_user_id) on delete set null,
  backup_manifest_id uuid references backup_manifests(id) on delete set null,
  status text not null default 'queued',
  target_environment text not null default 'staging-restore',
  notes text,
  result_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists secret_rotation_events (
  id uuid primary key default gen_random_uuid(),
  actor_id text references profiles(clerk_user_id) on delete set null,
  provider text not null,
  secret_name text not null,
  previous_fingerprint text,
  next_fingerprint text,
  status text not null default 'logged',
  rotated_at timestamptz not null default timezone('utc', now()),
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists audit_export_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by text references profiles(clerk_user_id) on delete set null,
  format text not null default 'json',
  scope text not null default 'ops',
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  download_path text,
  expires_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table mobile_push_devices enable row level security;
alter table push_notification_deliveries enable row level security;
alter table calendar_connections enable row level security;
alter table synced_calendar_events enable row level security;
alter table restore_drills enable row level security;
alter table secret_rotation_events enable row level security;
alter table audit_export_requests enable row level security;

drop policy if exists "Users manage their own mobile push devices" on mobile_push_devices;
create policy "Users manage their own mobile push devices" on mobile_push_devices
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

drop policy if exists "Users read their own push deliveries" on push_notification_deliveries;
create policy "Users read their own push deliveries" on push_notification_deliveries
  for select using (auth.uid()::text = user_id);

drop policy if exists "Users manage their own calendar connections" on calendar_connections;
create policy "Users manage their own calendar connections" on calendar_connections
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

drop policy if exists "Users manage their own synced calendar events" on synced_calendar_events;
create policy "Users manage their own synced calendar events" on synced_calendar_events
  for all using (auth.uid()::text = user_id) with check (auth.uid()::text = user_id);

drop policy if exists "Users read their own restore drills" on restore_drills;
create policy "Users read their own restore drills" on restore_drills
  for select using (auth.uid()::text = requested_by);

drop policy if exists "Users read their own secret rotations" on secret_rotation_events;
create policy "Users read their own secret rotations" on secret_rotation_events
  for select using (auth.uid()::text = actor_id);

drop policy if exists "Users manage their own audit exports" on audit_export_requests;
create policy "Users manage their own audit exports" on audit_export_requests
  for all using (auth.uid()::text = requested_by) with check (auth.uid()::text = requested_by);
