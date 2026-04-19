do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_type') then
    create type notification_type as enum ('follow', 'comment', 'message', 'system');
  end if;
end$$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  actor_id text,
  type notification_type not null default 'system',
  title text not null,
  body text default '',
  href text default '',
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint fk_notifications_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade,
  constraint fk_notifications_actor foreign key (actor_id) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.post_attachments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  uploader_id text not null,
  bucket text not null,
  object_path text unique not null,
  file_name text not null,
  content_type text not null,
  byte_size integer not null check (byte_size >= 0),
  created_at timestamptz not null default now(),
  constraint fk_post_attachments_post foreign key (post_id) references public.posts(id) on delete cascade,
  constraint fk_post_attachments_uploader foreign key (uploader_id) references public.profiles(clerk_user_id) on delete cascade
);

create index if not exists idx_notifications_user_unread_created_at
  on public.notifications (user_id, read_at, created_at desc);

create index if not exists idx_post_attachments_post_created_at
  on public.post_attachments (post_id, created_at asc);

alter table public.notifications enable row level security;
alter table public.post_attachments enable row level security;

drop policy if exists "notifications_select_self" on public.notifications;
create policy "notifications_select_self"
on public.notifications
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "notifications_update_self" on public.notifications;
create policy "notifications_update_self"
on public.notifications
for update
to authenticated
using (user_id = public.requesting_user_id())
with check (user_id = public.requesting_user_id());

drop policy if exists "post_attachments_select_visible" on public.post_attachments;
create policy "post_attachments_select_visible"
on public.post_attachments
for select
using (
  exists (
    select 1
    from public.posts p
    join public.communities c on c.id = p.community_id
    where p.id = post_attachments.post_id
      and (
        not c.is_private
        or exists (
          select 1
          from public.community_members cm
          where cm.community_id = c.id
            and cm.user_id = public.requesting_user_id()
        )
      )
  )
);

drop policy if exists "post_attachments_insert_owner" on public.post_attachments;
create policy "post_attachments_insert_owner"
on public.post_attachments
for insert
to authenticated
with check (uploader_id = public.requesting_user_id());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'science-platform-assets',
  'science-platform-assets',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end$$;
