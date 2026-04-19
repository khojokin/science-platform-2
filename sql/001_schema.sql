create extension if not exists pgcrypto;
create extension if not exists citext;

create or replace function public.requesting_user_id()
returns text
language sql
stable
as $$
  select auth.jwt()->>'sub'
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type membership_role as enum ('member', 'moderator', 'owner');
  end if;

  if not exists (select 1 from pg_type where typname = 'subscription_tier') then
    create type subscription_tier as enum ('free', 'starter', 'pro', 'team');
  end if;

  if not exists (select 1 from pg_type where typname = 'report_status') then
    create type report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');
  end if;

  if not exists (select 1 from pg_type where typname = 'conversation_type') then
    create type conversation_type as enum ('direct', 'group');
  end if;
end$$;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  handle citext unique,
  display_name text not null,
  headline text default '',
  bio text default '',
  avatar_url text default '',
  role text default 'student',
  interests text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  slug citext unique not null,
  description text not null,
  is_private boolean not null default false,
  created_by text default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  constraint fk_communities_created_by foreign key (created_by) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.community_members (
  community_id uuid not null,
  user_id text not null default public.requesting_user_id(),
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (community_id, user_id),
  constraint fk_community_members_community foreign key (community_id) references public.communities(id) on delete cascade,
  constraint fk_community_members_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null,
  author_id text not null default public.requesting_user_id(),
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_posts_community foreign key (community_id) references public.communities(id) on delete cascade,
  constraint fk_posts_author foreign key (author_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null,
  author_id text not null default public.requesting_user_id(),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_comments_post foreign key (post_id) references public.posts(id) on delete cascade,
  constraint fk_comments_author foreign key (author_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.follows (
  follower_id text not null default public.requesting_user_id(),
  following_id text not null,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint chk_follows_not_self check (follower_id <> following_id),
  constraint fk_follows_follower foreign key (follower_id) references public.profiles(clerk_user_id) on delete cascade,
  constraint fk_follows_following foreign key (following_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext unique not null,
  description text not null,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  scheduled_for timestamptz,
  owner_id text not null default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_study_groups_owner foreign key (owner_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.study_group_members (
  study_group_id uuid not null,
  user_id text not null default public.requesting_user_id(),
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (study_group_id, user_id),
  constraint fk_study_group_members_group foreign key (study_group_id) references public.study_groups(id) on delete cascade,
  constraint fk_study_group_members_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type conversation_type not null default 'direct',
  title text default '',
  created_by text not null default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  constraint fk_conversations_created_by foreign key (created_by) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.conversation_members (
  conversation_id uuid not null,
  user_id text not null,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id),
  constraint fk_conversation_members_conversation foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint fk_conversation_members_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  sender_id text not null default public.requesting_user_id(),
  body text not null,
  created_at timestamptz not null default now(),
  constraint fk_messages_conversation foreign key (conversation_id) references public.conversations(id) on delete cascade,
  constraint fk_messages_sender foreign key (sender_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text unique not null,
  tier subscription_tier not null default 'free',
  status text not null default 'inactive',
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_subscriptions_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id text not null default public.requesting_user_id(),
  target_type text not null check (target_type in ('post', 'comment', 'message', 'profile')),
  target_id text not null,
  reason text not null,
  details text default '',
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  constraint fk_reports_reporter foreign key (reporter_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  moderator_id text not null,
  action text not null,
  notes text default '',
  created_at timestamptz not null default now(),
  constraint fk_moderation_actions_report foreign key (report_id) references public.reports(id) on delete cascade,
  constraint fk_moderation_actions_moderator foreign key (moderator_id) references public.profiles(clerk_user_id) on delete cascade
);

create index if not exists idx_posts_community_created_at on public.posts (community_id, created_at desc);
create index if not exists idx_comments_post_created_at on public.comments (post_id, created_at asc);
create index if not exists idx_messages_conversation_created_at on public.messages (conversation_id, created_at desc);
create index if not exists idx_reports_status_created_at on public.reports (status, created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_posts_updated_at on public.posts;
create trigger set_posts_updated_at
before update on public.posts
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_comments_updated_at on public.comments;
create trigger set_comments_updated_at
before update on public.comments
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_groups_updated_at on public.study_groups;
create trigger set_groups_updated_at
before update on public.study_groups
for each row
execute procedure public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row
execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.communities enable row level security;
alter table public.community_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.study_groups enable row level security;
alter table public.study_group_members enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.subscriptions enable row level security;
alter table public.reports enable row level security;
alter table public.moderation_actions enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
on public.profiles
for select
using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (clerk_user_id = public.requesting_user_id());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (clerk_user_id = public.requesting_user_id())
with check (clerk_user_id = public.requesting_user_id());

drop policy if exists "communities_select_visible" on public.communities;
create policy "communities_select_visible"
on public.communities
for select
using (
  not is_private
  or exists (
    select 1
    from public.community_members cm
    where cm.community_id = communities.id
      and cm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "communities_insert_authenticated" on public.communities;
create policy "communities_insert_authenticated"
on public.communities
for insert
to authenticated
with check (created_by = public.requesting_user_id());

drop policy if exists "communities_update_owner" on public.communities;
create policy "communities_update_owner"
on public.communities
for update
to authenticated
using (created_by = public.requesting_user_id())
with check (created_by = public.requesting_user_id());

drop policy if exists "community_members_select_visible" on public.community_members;
create policy "community_members_select_visible"
on public.community_members
for select
using (
  exists (
    select 1
    from public.communities c
    where c.id = community_members.community_id
      and (
        not c.is_private
        or exists (
          select 1
          from public.community_members mine
          where mine.community_id = c.id
            and mine.user_id = public.requesting_user_id()
        )
      )
  )
);

drop policy if exists "community_members_insert_self" on public.community_members;
create policy "community_members_insert_self"
on public.community_members
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "community_members_delete_self" on public.community_members;
create policy "community_members_delete_self"
on public.community_members
for delete
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "posts_select_visible" on public.posts;
create policy "posts_select_visible"
on public.posts
for select
using (
  exists (
    select 1
    from public.communities c
    where c.id = posts.community_id
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

drop policy if exists "posts_insert_member" on public.posts;
create policy "posts_insert_member"
on public.posts
for insert
to authenticated
with check (
  author_id = public.requesting_user_id()
  and exists (
    select 1
    from public.community_members cm
    where cm.community_id = posts.community_id
      and cm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "posts_update_author" on public.posts;
create policy "posts_update_author"
on public.posts
for update
to authenticated
using (author_id = public.requesting_user_id())
with check (author_id = public.requesting_user_id());

drop policy if exists "comments_select_visible" on public.comments;
create policy "comments_select_visible"
on public.comments
for select
using (
  exists (
    select 1
    from public.posts p
    join public.communities c on c.id = p.community_id
    where p.id = comments.post_id
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

drop policy if exists "comments_insert_member" on public.comments;
create policy "comments_insert_member"
on public.comments
for insert
to authenticated
with check (
  author_id = public.requesting_user_id()
  and exists (
    select 1
    from public.posts p
    join public.community_members cm on cm.community_id = p.community_id
    where p.id = comments.post_id
      and cm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "comments_update_author" on public.comments;
create policy "comments_update_author"
on public.comments
for update
to authenticated
using (author_id = public.requesting_user_id())
with check (author_id = public.requesting_user_id());

drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_all"
on public.follows
for select
using (true);

drop policy if exists "follows_insert_self" on public.follows;
create policy "follows_insert_self"
on public.follows
for insert
to authenticated
with check (follower_id = public.requesting_user_id());

drop policy if exists "follows_delete_self" on public.follows;
create policy "follows_delete_self"
on public.follows
for delete
to authenticated
using (follower_id = public.requesting_user_id());

drop policy if exists "study_groups_select_visible" on public.study_groups;
create policy "study_groups_select_visible"
on public.study_groups
for select
using (
  visibility = 'public'
  or exists (
    select 1
    from public.study_group_members gm
    where gm.study_group_id = study_groups.id
      and gm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "study_groups_insert_authenticated" on public.study_groups;
create policy "study_groups_insert_authenticated"
on public.study_groups
for insert
to authenticated
with check (owner_id = public.requesting_user_id());

drop policy if exists "study_groups_update_owner" on public.study_groups;
create policy "study_groups_update_owner"
on public.study_groups
for update
to authenticated
using (owner_id = public.requesting_user_id())
with check (owner_id = public.requesting_user_id());

drop policy if exists "study_group_members_select_visible" on public.study_group_members;
create policy "study_group_members_select_visible"
on public.study_group_members
for select
using (
  exists (
    select 1
    from public.study_groups sg
    where sg.id = study_group_members.study_group_id
      and (
        sg.visibility = 'public'
        or exists (
          select 1
          from public.study_group_members mine
          where mine.study_group_id = sg.id
            and mine.user_id = public.requesting_user_id()
        )
      )
  )
);

drop policy if exists "study_group_members_insert_self" on public.study_group_members;
create policy "study_group_members_insert_self"
on public.study_group_members
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "study_group_members_delete_self" on public.study_group_members;
create policy "study_group_members_delete_self"
on public.study_group_members
for delete
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "conversations_select_member" on public.conversations;
create policy "conversations_select_member"
on public.conversations
for select
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversations.id
      and cm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "conversations_insert_authenticated" on public.conversations;
create policy "conversations_insert_authenticated"
on public.conversations
for insert
to authenticated
with check (created_by = public.requesting_user_id());

drop policy if exists "conversation_members_select_member" on public.conversation_members;
create policy "conversation_members_select_member"
on public.conversation_members
for select
using (
  exists (
    select 1
    from public.conversation_members mine
    where mine.conversation_id = conversation_members.conversation_id
      and mine.user_id = public.requesting_user_id()
  )
);

drop policy if exists "conversation_members_insert_self" on public.conversation_members;
create policy "conversation_members_insert_self"
on public.conversation_members
for insert
to authenticated
with check (user_id = public.requesting_user_id());

drop policy if exists "messages_select_member" on public.messages;
create policy "messages_select_member"
on public.messages
for select
using (
  exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_member"
on public.messages
for insert
to authenticated
with check (
  sender_id = public.requesting_user_id()
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = messages.conversation_id
      and cm.user_id = public.requesting_user_id()
  )
);

drop policy if exists "subscriptions_select_self" on public.subscriptions;
create policy "subscriptions_select_self"
on public.subscriptions
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "reports_select_self" on public.reports;
create policy "reports_select_self"
on public.reports
for select
to authenticated
using (reporter_id = public.requesting_user_id());

drop policy if exists "reports_insert_self" on public.reports;
create policy "reports_insert_self"
on public.reports
for insert
to authenticated
with check (reporter_id = public.requesting_user_id());

drop policy if exists "moderation_actions_none" on public.moderation_actions;
create policy "moderation_actions_none"
on public.moderation_actions
for select
to authenticated
using (false);

insert into public.communities (name, slug, description, is_private, created_by)
values
  ('Physics', 'physics', 'Classical mechanics, relativity, quantum, and lab discussion.', false, null),
  ('Biology', 'biology', 'Cell biology, genetics, microbiology, and life sciences.', false, null),
  ('Chemistry', 'chemistry', 'Organic, inorganic, physical, and analytical chemistry.', false, null),
  ('Astronomy', 'astronomy', 'Cosmology, observation, astrophysics, and amateur astronomy.', false, null),
  ('Mathematics', 'mathematics', 'Pure math, applied math, and problem solving.', false, null),
  ('Environmental Science', 'environmental-science', 'Climate, ecosystems, sustainability, and field work.', false, null),
  ('Neuroscience', 'neuroscience', 'Brains, cognition, systems, and neurotech.', false, null),
  ('Engineering', 'engineering', 'Design, materials, electronics, and systems thinking.', false, null),
  ('Medical Science', 'medical-science', 'Clinical science, biomedical learning, and health research.', false, null)
on conflict (slug) do nothing;
