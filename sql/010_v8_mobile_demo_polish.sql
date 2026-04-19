-- V8: native mobile RTC signaling, offline sync logs, onboarding, demo/investor support, push receipts

alter table if exists public.push_notification_deliveries
  add column if not exists receipt_status text,
  add column if not exists receipt_checked_at timestamptz,
  add column if not exists receipt_details jsonb not null default '{}'::jsonb;

create table if not exists public.mobile_call_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.call_rooms(id) on delete cascade,
  user_id text not null references public.profiles(clerk_user_id) on delete cascade,
  display_name text not null default 'Scientist',
  role text not null default 'participant',
  is_audio_enabled boolean not null default true,
  is_video_enabled boolean not null default true,
  connection_state text not null default 'joining',
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (room_id, user_id)
);

create table if not exists public.mobile_call_signals (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.call_rooms(id) on delete cascade,
  sender_user_id text not null references public.profiles(clerk_user_id) on delete cascade,
  recipient_user_id text references public.profiles(clerk_user_id) on delete cascade,
  signal_type text not null,
  payload jsonb not null default '{}'::jsonb,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_mobile_call_participants_room_last_seen
  on public.mobile_call_participants (room_id, last_seen_at desc);

create index if not exists idx_mobile_call_signals_room_created
  on public.mobile_call_signals (room_id, created_at asc);

create index if not exists idx_mobile_call_signals_recipient
  on public.mobile_call_signals (recipient_user_id, delivered_at, created_at asc);

create table if not exists public.offline_sync_events (
  id uuid primary key default gen_random_uuid(),
  user_id text references public.profiles(clerk_user_id) on delete set null,
  device_id uuid references public.mobile_push_devices(id) on delete set null,
  platform text not null default 'mobile',
  sync_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued',
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists idx_offline_sync_events_user_created
  on public.offline_sync_events (user_id, created_at desc);

create table if not exists public.onboarding_progress (
  user_id text primary key references public.profiles(clerk_user_id) on delete cascade,
  current_step text not null default 'welcome',
  selected_track text,
  goals text[] not null default '{}'::text[],
  interests text[] not null default '{}'::text[],
  has_completed boolean not null default false,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.demo_scenarios (
  key text primary key,
  title text not null,
  summary text not null default '',
  cta_href text not null default '/sign-up',
  metrics jsonb not null default '{}'::jsonb,
  highlights text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.demo_scenarios (key, title, summary, cta_href, metrics, highlights)
values
  (
    'student_launch',
    'STEM study network',
    'Showcase communities, study groups, AI, calls, and premium learning workflows.',
    '/demo',
    '{"communityCount": 12, "weeklyPosts": 1480, "avgStudyHours": 6.2, "nps": 58}'::jsonb,
    array[
      'Physics, biology, chemistry, astronomy, engineering, and mathematics communities',
      'Group calls, notes, semantic search, and AI study help',
      'Premium tiers for power users, labs, and institutions'
    ]::text[]
  ),
  (
    'investor_mode',
    'Investor walkthrough',
    'A guided narrative for demos, screenshots, and pitch meetings.',
    '/demo/investor',
    '{"waitlist": 9400, "paidConversion": 0.071, "campusLeads": 28, "retention30d": 0.42}'::jsonb,
    array[
      'One-click product tour with seeded content',
      'Clear monetization story across Starter, Pro, and Institution',
      'Operations, compliance, and collaboration surfaces included'
    ]::text[]
  )
on conflict (key) do update set
  title = excluded.title,
  summary = excluded.summary,
  cta_href = excluded.cta_href,
  metrics = excluded.metrics,
  highlights = excluded.highlights,
  updated_at = now();

create or replace function public.cleanup_mobile_call_artifacts()
returns void
language plpgsql
as $$
begin
  update public.mobile_call_participants
  set connection_state = 'stale', left_at = coalesce(left_at, now())
  where left_at is null and last_seen_at < now() - interval '10 minutes';

  delete from public.mobile_call_signals
  where created_at < now() - interval '2 days';
end;
$$;

create or replace function public.complete_onboarding(
  selected_track_input text,
  goals_input text[],
  interests_input text[],
  metadata_input jsonb default '{}'::jsonb
)
returns public.onboarding_progress
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id text := public.requesting_user_id();
  row_result public.onboarding_progress;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.onboarding_progress (
    user_id,
    current_step,
    selected_track,
    goals,
    interests,
    has_completed,
    completed_at,
    metadata,
    updated_at
  ) values (
    current_user_id,
    'complete',
    nullif(selected_track_input, ''),
    coalesce(goals_input, '{}'::text[]),
    coalesce(interests_input, '{}'::text[]),
    true,
    now(),
    coalesce(metadata_input, '{}'::jsonb),
    now()
  )
  on conflict (user_id) do update set
    current_step = 'complete',
    selected_track = nullif(selected_track_input, ''),
    goals = coalesce(goals_input, '{}'::text[]),
    interests = coalesce(interests_input, '{}'::text[]),
    has_completed = true,
    completed_at = now(),
    metadata = coalesce(metadata_input, '{}'::jsonb),
    updated_at = now()
  returning * into row_result;

  update public.profiles
  set interests = coalesce(interests_input, interests),
      updated_at = now()
  where clerk_user_id = current_user_id;

  return row_result;
end;
$$;

alter table public.onboarding_progress enable row level security;
alter table public.mobile_call_participants enable row level security;
alter table public.mobile_call_signals enable row level security;
alter table public.offline_sync_events enable row level security;
alter table public.demo_scenarios enable row level security;

drop policy if exists "Users read own onboarding progress" on public.onboarding_progress;
create policy "Users read own onboarding progress" on public.onboarding_progress
for select using (user_id = public.requesting_user_id());

drop policy if exists "Users manage own onboarding progress" on public.onboarding_progress;
create policy "Users manage own onboarding progress" on public.onboarding_progress
for all using (user_id = public.requesting_user_id())
with check (user_id = public.requesting_user_id());

drop policy if exists "Participants read room participants" on public.mobile_call_participants;
create policy "Participants read room participants" on public.mobile_call_participants
for select using (
  exists (
    select 1 from public.call_room_members crm
    where crm.call_room_id = room_id and crm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "Participants manage self participant rows" on public.mobile_call_participants;
create policy "Participants manage self participant rows" on public.mobile_call_participants
for all using (user_id = public.requesting_user_id())
with check (user_id = public.requesting_user_id());

drop policy if exists "Participants read signals" on public.mobile_call_signals;
create policy "Participants read signals" on public.mobile_call_signals
for select using (
  sender_user_id = public.requesting_user_id()
  or recipient_user_id = public.requesting_user_id()
  or (
    recipient_user_id is null
    and exists (
      select 1 from public.call_room_members crm
      where crm.call_room_id = room_id and crm.user_id = public.requesting_user_id()
    )
  )
);

drop policy if exists "Participants insert signals" on public.mobile_call_signals;
create policy "Participants insert signals" on public.mobile_call_signals
for insert with check (
  sender_user_id = public.requesting_user_id()
  and exists (
    select 1 from public.call_room_members crm
    where crm.call_room_id = room_id and crm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "Users read own offline sync events" on public.offline_sync_events;
create policy "Users read own offline sync events" on public.offline_sync_events
for select using (user_id = public.requesting_user_id());

drop policy if exists "Users insert own offline sync events" on public.offline_sync_events;
create policy "Users insert own offline sync events" on public.offline_sync_events
for insert with check (user_id = public.requesting_user_id());

drop policy if exists "Anyone can read demo scenarios" on public.demo_scenarios;
create policy "Anyone can read demo scenarios" on public.demo_scenarios
for select using (true);
