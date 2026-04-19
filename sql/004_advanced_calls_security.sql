do $$
begin
  if not exists (select 1 from pg_type where typname = 'call_provider') then
    create type call_provider as enum ('native_mesh', 'zoom_video', 'zoom_meeting');
  end if;

  if not exists (select 1 from pg_type where typname = 'call_media_mode') then
    create type call_media_mode as enum ('audio', 'video');
  end if;
end$$;

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id text,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fk_audit_logs_actor foreign key (actor_id) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  action text not null,
  created_at timestamptz not null default now(),
  constraint fk_rate_limit_events_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.call_rooms (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  title text not null,
  description text not null default '',
  provider call_provider not null default 'native_mesh',
  media_mode call_media_mode not null default 'video',
  is_private boolean not null default false,
  host_user_id text not null default public.requesting_user_id(),
  meeting_number text,
  meeting_password text default '',
  zoom_session_name text,
  zoom_session_password text default '',
  scheduled_for timestamptz,
  max_participants integer not null default 12 check (max_participants between 2 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_call_rooms_host foreign key (host_user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.call_room_members (
  call_room_id uuid not null,
  user_id text not null default public.requesting_user_id(),
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (call_room_id, user_id),
  constraint fk_call_room_members_room foreign key (call_room_id) references public.call_rooms(id) on delete cascade,
  constraint fk_call_room_members_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index if not exists idx_rate_limit_events_user_action_created_at on public.rate_limit_events (user_id, action, created_at desc);
create index if not exists idx_call_rooms_created_at on public.call_rooms (created_at desc);
create index if not exists idx_call_rooms_host on public.call_rooms (host_user_id);
create index if not exists idx_call_room_members_user on public.call_room_members (user_id, created_at desc);

drop trigger if exists set_call_rooms_updated_at on public.call_rooms;
create trigger set_call_rooms_updated_at
before update on public.call_rooms
for each row
execute function public.set_updated_at();

alter table public.audit_logs enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.call_rooms enable row level security;
alter table public.call_room_members enable row level security;

drop policy if exists "audit_logs_no_direct_access" on public.audit_logs;
create policy "audit_logs_no_direct_access"
on public.audit_logs
for select
to authenticated
using (false);

drop policy if exists "rate_limit_events_select_self" on public.rate_limit_events;
create policy "rate_limit_events_select_self"
on public.rate_limit_events
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "rate_limit_events_insert_self" on public.rate_limit_events;
create policy "rate_limit_events_insert_self"
on public.rate_limit_events
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "call_rooms_select_visible" on public.call_rooms;
create policy "call_rooms_select_visible"
on public.call_rooms
for select
to authenticated
using (
  not is_private
  or host_user_id = public.requesting_user_id()
  or exists (
    select 1
    from public.call_room_members
    where call_room_members.call_room_id = id
      and call_room_members.user_id = public.requesting_user_id()
  )
);

drop policy if exists "call_rooms_insert_host" on public.call_rooms;
create policy "call_rooms_insert_host"
on public.call_rooms
for insert
to authenticated
with check (host_user_id = public.requesting_user_id());

drop policy if exists "call_rooms_update_host" on public.call_rooms;
create policy "call_rooms_update_host"
on public.call_rooms
for update
to authenticated
using (host_user_id = public.requesting_user_id())
with check (host_user_id = public.requesting_user_id());

drop policy if exists "call_rooms_delete_host" on public.call_rooms;
create policy "call_rooms_delete_host"
on public.call_rooms
for delete
to authenticated
using (host_user_id = public.requesting_user_id());

drop policy if exists "call_room_members_select_visible" on public.call_room_members;
create policy "call_room_members_select_visible"
on public.call_room_members
for select
to authenticated
using (
  exists (
    select 1
    from public.call_rooms
    where call_rooms.id = call_room_members.call_room_id
      and (
        not call_rooms.is_private
        or call_rooms.host_user_id = public.requesting_user_id()
        or call_room_members.user_id = public.requesting_user_id()
        or exists (
          select 1
          from public.call_room_members viewer_membership
          where viewer_membership.call_room_id = call_room_members.call_room_id
            and viewer_membership.user_id = public.requesting_user_id()
        )
      )
  )
);

drop policy if exists "call_room_members_insert_self" on public.call_room_members;
create policy "call_room_members_insert_self"
on public.call_room_members
for insert
to authenticated
with check (
  user_id = public.requesting_user_id()
  and exists (
    select 1
    from public.call_rooms
    where call_rooms.id = call_room_members.call_room_id
      and (
        not call_rooms.is_private
        or call_rooms.host_user_id = public.requesting_user_id()
      )
  )
);

drop policy if exists "call_room_members_delete_self_or_host" on public.call_room_members;
create policy "call_room_members_delete_self_or_host"
on public.call_room_members
for delete
to authenticated
using (
  user_id = public.requesting_user_id()
  or exists (
    select 1
    from public.call_rooms
    where call_rooms.id = call_room_members.call_room_id
      and call_rooms.host_user_id = public.requesting_user_id()
  )
);

drop policy if exists "posts_delete_author" on public.posts;
create policy "posts_delete_author"
on public.posts
for delete
to authenticated
using (author_id = public.requesting_user_id());

drop policy if exists "comments_delete_author" on public.comments;
create policy "comments_delete_author"
on public.comments
for delete
to authenticated
using (author_id = public.requesting_user_id());

drop policy if exists "communities_delete_owner" on public.communities;
create policy "communities_delete_owner"
on public.communities
for delete
to authenticated
using (created_by = public.requesting_user_id());

drop policy if exists "study_groups_delete_owner" on public.study_groups;
create policy "study_groups_delete_owner"
on public.study_groups
for delete
to authenticated
using (owner_id = public.requesting_user_id());

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'call_room_members'
  ) then
    alter publication supabase_realtime add table public.call_room_members;
  end if;
end$$;
