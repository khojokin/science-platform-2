do $$
begin
  begin
    alter type call_provider add value if not exists 'livekit_sfu';
  exception
    when duplicate_object then null;
  end;
end$$;

create table if not exists public.call_room_sfu_sessions (
  id uuid primary key default gen_random_uuid(),
  call_room_id uuid not null references public.call_rooms(id) on delete cascade,
  provider text not null default 'livekit',
  room_name text not null,
  livekit_room_sid text,
  status text not null default 'pending',
  active_participants integer not null default 0,
  started_by text references public.profiles(clerk_user_id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (call_room_id, room_name)
);

create index if not exists idx_call_room_sfu_sessions_room on public.call_room_sfu_sessions(call_room_id, created_at desc);

create table if not exists public.call_recording_exports (
  id uuid primary key default gen_random_uuid(),
  call_room_id uuid references public.call_rooms(id) on delete set null,
  provider text not null default 'livekit',
  egress_id text unique,
  room_name text not null,
  output_type text not null default 'mp4',
  status text not null default 'queued',
  storage_bucket text,
  object_path text,
  playback_url text,
  transcript_status text not null default 'pending',
  transcript_text text,
  initiated_by text references public.profiles(clerk_user_id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_call_recording_exports_room on public.call_recording_exports(call_room_id, created_at desc);
create index if not exists idx_call_recording_exports_status on public.call_recording_exports(status, created_at desc);

alter table public.call_room_sfu_sessions enable row level security;
alter table public.call_recording_exports enable row level security;

drop policy if exists "call_room_sfu_sessions_select" on public.call_room_sfu_sessions;
create policy "call_room_sfu_sessions_select"
on public.call_room_sfu_sessions
for select
using (
  exists (
    select 1
    from public.call_rooms room
    left join public.call_room_members member
      on member.call_room_id = room.id
      and member.user_id = public.requesting_user_id()
    where room.id = call_room_sfu_sessions.call_room_id
      and (room.is_private = false or room.host_user_id = public.requesting_user_id() or member.user_id is not null)
  )
);

drop policy if exists "call_room_sfu_sessions_manage" on public.call_room_sfu_sessions;
create policy "call_room_sfu_sessions_manage"
on public.call_room_sfu_sessions
for all
using (
  exists (
    select 1
    from public.call_rooms room
    left join public.call_room_members member
      on member.call_room_id = room.id
      and member.user_id = public.requesting_user_id()
    where room.id = call_room_sfu_sessions.call_room_id
      and (room.host_user_id = public.requesting_user_id() or member.role in ('owner', 'moderator'))
  )
)
with check (
  exists (
    select 1
    from public.call_rooms room
    left join public.call_room_members member
      on member.call_room_id = room.id
      and member.user_id = public.requesting_user_id()
    where room.id = call_room_sfu_sessions.call_room_id
      and (room.host_user_id = public.requesting_user_id() or member.role in ('owner', 'moderator'))
  )
);

drop policy if exists "call_recording_exports_select" on public.call_recording_exports;
create policy "call_recording_exports_select"
on public.call_recording_exports
for select
using (
  initiated_by = public.requesting_user_id()
  or exists (
    select 1
    from public.call_rooms room
    left join public.call_room_members member
      on member.call_room_id = room.id
      and member.user_id = public.requesting_user_id()
    where room.id = call_recording_exports.call_room_id
      and (room.is_private = false or room.host_user_id = public.requesting_user_id() or member.user_id is not null)
  )
);

drop policy if exists "call_recording_exports_manage" on public.call_recording_exports;
create policy "call_recording_exports_manage"
on public.call_recording_exports
for all
using (
  initiated_by = public.requesting_user_id()
  or exists (
    select 1
    from public.call_rooms room
    left join public.call_room_members member
      on member.call_room_id = room.id
      and member.user_id = public.requesting_user_id()
    where room.id = call_recording_exports.call_room_id
      and (room.host_user_id = public.requesting_user_id() or member.role in ('owner', 'moderator'))
  )
)
with check (
  initiated_by = public.requesting_user_id()
  or exists (
    select 1
    from public.call_rooms room
    left join public.call_room_members member
      on member.call_room_id = room.id
      and member.user_id = public.requesting_user_id()
    where room.id = call_recording_exports.call_room_id
      and (room.host_user_id = public.requesting_user_id() or member.role in ('owner', 'moderator'))
  )
);

create table if not exists public.demo_showcase_cards (
  key text primary key,
  audience text not null default 'general',
  title text not null,
  summary text not null default '',
  route_href text not null default '/demo',
  metrics jsonb not null default '{}'::jsonb,
  bullets text[] not null default '{}'::text[],
  gradient text not null default 'science',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.demo_showcase_cards (key, audience, title, summary, route_href, metrics, bullets, gradient, position)
values
  (
    'student_network',
    'students',
    'Student growth engine',
    'Showcase a sticky daily workflow from discovery to study group to call recording replay.',
    '/demo',
    '{"weeklyActiveUsers": 5240, "avgStudyGroupsPerUser": 2.7, "retention30d": 0.44}'::jsonb,
    array[
      'Subject communities, AI help, vault items, bounties, and live calls',
      'Mobile deep links take users from a push straight into the right room or recording',
      'LiveKit SFU supports larger room sizes than native mesh'
    ]::text[],
    'aurora',
    10
  ),
  (
    'institution_workspace',
    'institutions',
    'Institution workspace story',
    'Show a private campus or lab workspace with events, calls, recordings, and moderation.',
    '/demo/presentation?audience=institutions',
    '{"institutionSeats": 780, "workspaceAdmins": 14, "eventsPerMonth": 18}'::jsonb,
    array[
      'Clerk organizations map to labs, clubs, and academic teams',
      'Private calls and recording exports create durable knowledge assets',
      'Moderation, audit exports, and billing portals support procurement reviews'
    ]::text[],
    'indigo',
    20
  ),
  (
    'investor_pitch',
    'investors',
    'Investor presentation mode',
    'Walk through traction, monetization, ops maturity, and defensibility in a single flow.',
    '/demo/presentation?audience=investors',
    '{"waitlist": 12400, "paidConversion": 0.083, "grossMargin": 0.78}'::jsonb,
    array[
      'Premium subscriptions plus expert services plus institutions',
      'LiveKit, AI, and workspaces deepen retention and switching costs',
      'Operations console, backups, audit exports, and rate limits reduce launch risk'
    ]::text[],
    'sunset',
    30
  )
on conflict (key) do update set
  audience = excluded.audience,
  title = excluded.title,
  summary = excluded.summary,
  route_href = excluded.route_href,
  metrics = excluded.metrics,
  bullets = excluded.bullets,
  gradient = excluded.gradient,
  position = excluded.position,
  updated_at = now();

insert into public.demo_scenarios (key, title, summary, cta_href, metrics, highlights)
values
  (
    'livekit_sfu_calls',
    'SFU calls and recording exports',
    'Move beyond small-group mesh rooms with scalable LiveKit rooms, recording exports, and deep-linked replays.',
    '/demo/presentation?audience=investors',
    '{"maxRoomSize": 200, "avgReplayRate": 0.37, "recordingExports": 46}'::jsonb,
    array[
      'Token endpoint and webhook ingestion for server-controlled room access',
      'Room recordings can export to MP4 or HLS and land in S3-compatible storage',
      'Mobile push opens directly into a call room or replay route'
    ]::text[]
  )
on conflict (key) do update set
  title = excluded.title,
  summary = excluded.summary,
  cta_href = excluded.cta_href,
  metrics = excluded.metrics,
  highlights = excluded.highlights,
  updated_at = now();
