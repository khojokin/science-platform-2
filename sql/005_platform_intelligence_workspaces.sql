
create extension if not exists vector;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_type') then
    create type workspace_type as enum ('lab', 'institution', 'student_club', 'tutoring_team');
  end if;

  if not exists (select 1 from pg_type where typname = 'vault_visibility') then
    create type vault_visibility as enum ('public', 'premium', 'private');
  end if;

  if not exists (select 1 from pg_type where typname = 'bounty_status') then
    create type bounty_status as enum ('open', 'awarded', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'event_type') then
    create type event_type as enum ('study_session', 'webinar', 'office_hours', 'competition', 'paper_club');
  end if;

  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type verification_status as enum ('pending', 'approved', 'rejected');
  end if;

  if not exists (select 1 from pg_type where typname = 'recording_status') then
    create type recording_status as enum ('pending', 'processing', 'ready', 'failed');
  end if;

  if not exists (select 1 from pg_type where typname = 'ai_message_role') then
    create type ai_message_role as enum ('system', 'user', 'assistant');
  end if;
end$$;

create table if not exists public.workspace_profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_org_id text unique not null,
  owner_id text not null default public.requesting_user_id(),
  name text not null,
  slug citext unique not null,
  description text not null default '',
  workspace_type workspace_type not null default 'lab',
  is_public boolean not null default false,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_workspace_profiles_owner foreign key (owner_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.reputations (
  user_id text primary key,
  score integer not null default 0,
  helpful_answers integer not null default 0,
  contributions integer not null default 0,
  mentor_sessions integer not null default 0,
  streak_days integer not null default 0,
  verified_expert boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_reputations_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.user_wallets (
  user_id text primary key,
  balance_credits integer not null default 100,
  lifetime_earned_credits integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_user_wallets_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.credit_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  delta integer not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fk_credit_transactions_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.research_clubs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  title text not null,
  slug citext unique not null,
  description text not null,
  cadence text not null default 'weekly',
  owner_id text not null default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_research_clubs_workspace foreign key (workspace_id) references public.workspace_profiles(id) on delete set null,
  constraint fk_research_clubs_owner foreign key (owner_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.paper_sessions (
  id uuid primary key default gen_random_uuid(),
  research_club_id uuid not null,
  title text not null,
  paper_title text default '',
  paper_url text default '',
  scheduled_for timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  constraint fk_paper_sessions_club foreign key (research_club_id) references public.research_clubs(id) on delete cascade
);

create table if not exists public.lab_projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  title text not null,
  slug citext unique not null,
  summary text not null,
  status text not null default 'planning' check (status in ('planning','active','review','complete')),
  owner_id text not null default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_lab_projects_workspace foreign key (workspace_id) references public.workspace_profiles(id) on delete set null,
  constraint fk_lab_projects_owner foreign key (owner_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.lab_notebooks (
  id uuid primary key default gen_random_uuid(),
  lab_project_id uuid not null,
  title text not null,
  body text not null,
  visibility text not null default 'team' check (visibility in ('team','public')),
  author_id text not null default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_lab_notebooks_project foreign key (lab_project_id) references public.lab_projects(id) on delete cascade,
  constraint fk_lab_notebooks_author foreign key (author_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.resource_vault_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid,
  owner_id text not null default public.requesting_user_id(),
  title text not null,
  slug citext unique not null,
  description text not null,
  content_markdown text default '',
  source_url text default '',
  visibility vault_visibility not null default 'public',
  premium_only boolean not null default false,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_resource_vault_items_workspace foreign key (workspace_id) references public.workspace_profiles(id) on delete set null,
  constraint fk_resource_vault_items_owner foreign key (owner_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.question_bounties (
  id uuid primary key default gen_random_uuid(),
  author_id text not null default public.requesting_user_id(),
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  reward_credits integer not null default 25 check (reward_credits > 0),
  status bounty_status not null default 'open',
  closes_at timestamptz,
  accepted_answer_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_question_bounties_author foreign key (author_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.bounty_responses (
  id uuid primary key default gen_random_uuid(),
  bounty_id uuid not null,
  author_id text not null default public.requesting_user_id(),
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_bounty_responses_bounty foreign key (bounty_id) references public.question_bounties(id) on delete cascade,
  constraint fk_bounty_responses_author foreign key (author_id) references public.profiles(clerk_user_id) on delete cascade
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'question_bounties'
      and constraint_name = 'fk_question_bounties_accepted_answer'
  ) then
    alter table public.question_bounties
      add constraint fk_question_bounties_accepted_answer foreign key (accepted_answer_id)
      references public.bounty_responses(id) on delete set null;
  end if;
end$$;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  organizer_id text not null default public.requesting_user_id(),
  workspace_id uuid,
  title text not null,
  slug citext unique not null,
  description text not null,
  event_type event_type not null default 'study_session',
  scheduled_for timestamptz not null,
  ends_at timestamptz,
  location_text text default '',
  virtual_url text default '',
  premium_only boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_events_organizer foreign key (organizer_id) references public.profiles(clerk_user_id) on delete cascade,
  constraint fk_events_workspace foreign key (workspace_id) references public.workspace_profiles(id) on delete set null
);

create table if not exists public.event_registrations (
  event_id uuid not null,
  user_id text not null default public.requesting_user_id(),
  status text not null default 'registered' check (status in ('registered','waitlist','cancelled')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id),
  constraint fk_event_registrations_event foreign key (event_id) references public.events(id) on delete cascade,
  constraint fk_event_registrations_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.campus_chapters (
  id uuid primary key default gen_random_uuid(),
  slug citext unique not null,
  name text not null,
  campus_name text not null,
  region text not null,
  description text not null,
  lead_user_id text not null default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_campus_chapters_lead foreign key (lead_user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.chapter_members (
  chapter_id uuid not null,
  user_id text not null default public.requesting_user_id(),
  role membership_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (chapter_id, user_id),
  constraint fk_chapter_members_chapter foreign key (chapter_id) references public.campus_chapters(id) on delete cascade,
  constraint fk_chapter_members_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  verification_type text not null default 'expert',
  evidence_url text default '',
  note text not null default '',
  status verification_status not null default 'pending',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_verification_requests_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade,
  constraint fk_verification_requests_reviewed_by foreign key (reviewed_by) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.search_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  owner_id text,
  title text not null,
  body text not null default '',
  url text default '',
  visibility vault_visibility not null default 'public',
  tags text[] not null default '{}',
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id),
  constraint fk_search_documents_owner foreign key (owner_id) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default public.requesting_user_id(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_ai_conversations_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null,
  role ai_message_role not null,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fk_ai_messages_conversation foreign key (conversation_id) references public.ai_conversations(id) on delete cascade
);

create table if not exists public.call_recordings (
  id uuid primary key default gen_random_uuid(),
  call_room_id uuid,
  title text not null,
  provider call_provider not null default 'native_mesh',
  external_recording_id text default '',
  transcript_text text default '',
  transcript_status recording_status not null default 'pending',
  is_public boolean not null default false,
  created_by text not null default public.requesting_user_id(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_call_recordings_call_room foreign key (call_room_id) references public.call_rooms(id) on delete set null,
  constraint fk_call_recordings_created_by foreign key (created_by) references public.profiles(clerk_user_id) on delete cascade
);

create index if not exists idx_workspace_profiles_owner on public.workspace_profiles (owner_id, updated_at desc);
create index if not exists idx_research_clubs_workspace on public.research_clubs (workspace_id, created_at desc);
create index if not exists idx_lab_projects_workspace on public.lab_projects (workspace_id, updated_at desc);
create index if not exists idx_lab_notebooks_project on public.lab_notebooks (lab_project_id, created_at desc);
create index if not exists idx_resource_vault_items_owner on public.resource_vault_items (owner_id, created_at desc);
create index if not exists idx_question_bounties_status on public.question_bounties (status, created_at desc);
create index if not exists idx_events_scheduled_for on public.events (scheduled_for asc);
create index if not exists idx_search_documents_visibility on public.search_documents (visibility, updated_at desc);
create index if not exists idx_search_documents_embedding on public.search_documents using ivfflat (embedding vector_cosine_ops) with (lists = 100);

drop trigger if exists set_workspace_profiles_updated_at on public.workspace_profiles;
create trigger set_workspace_profiles_updated_at before update on public.workspace_profiles for each row execute function public.set_updated_at();
drop trigger if exists set_reputations_updated_at on public.reputations;
create trigger set_reputations_updated_at before update on public.reputations for each row execute function public.set_updated_at();
drop trigger if exists set_user_wallets_updated_at on public.user_wallets;
create trigger set_user_wallets_updated_at before update on public.user_wallets for each row execute function public.set_updated_at();
drop trigger if exists set_research_clubs_updated_at on public.research_clubs;
create trigger set_research_clubs_updated_at before update on public.research_clubs for each row execute function public.set_updated_at();
drop trigger if exists set_lab_projects_updated_at on public.lab_projects;
create trigger set_lab_projects_updated_at before update on public.lab_projects for each row execute function public.set_updated_at();
drop trigger if exists set_lab_notebooks_updated_at on public.lab_notebooks;
create trigger set_lab_notebooks_updated_at before update on public.lab_notebooks for each row execute function public.set_updated_at();
drop trigger if exists set_resource_vault_items_updated_at on public.resource_vault_items;
create trigger set_resource_vault_items_updated_at before update on public.resource_vault_items for each row execute function public.set_updated_at();
drop trigger if exists set_question_bounties_updated_at on public.question_bounties;
create trigger set_question_bounties_updated_at before update on public.question_bounties for each row execute function public.set_updated_at();
drop trigger if exists set_bounty_responses_updated_at on public.bounty_responses;
create trigger set_bounty_responses_updated_at before update on public.bounty_responses for each row execute function public.set_updated_at();
drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at before update on public.events for each row execute function public.set_updated_at();
drop trigger if exists set_campus_chapters_updated_at on public.campus_chapters;
create trigger set_campus_chapters_updated_at before update on public.campus_chapters for each row execute function public.set_updated_at();
drop trigger if exists set_verification_requests_updated_at on public.verification_requests;
create trigger set_verification_requests_updated_at before update on public.verification_requests for each row execute function public.set_updated_at();
drop trigger if exists set_search_documents_updated_at on public.search_documents;
create trigger set_search_documents_updated_at before update on public.search_documents for each row execute function public.set_updated_at();
drop trigger if exists set_ai_conversations_updated_at on public.ai_conversations;
create trigger set_ai_conversations_updated_at before update on public.ai_conversations for each row execute function public.set_updated_at();
drop trigger if exists set_call_recordings_updated_at on public.call_recordings;
create trigger set_call_recordings_updated_at before update on public.call_recordings for each row execute function public.set_updated_at();

create or replace function public.match_search_documents(
  query_embedding vector(1536),
  match_count int default 10
)
returns table (
  id uuid,
  source_type text,
  source_id text,
  owner_id text,
  title text,
  body text,
  url text,
  visibility vault_visibility,
  tags text[],
  similarity float
)
language sql
stable
as $$
  select
    search_documents.id,
    search_documents.source_type,
    search_documents.source_id,
    search_documents.owner_id,
    search_documents.title,
    search_documents.body,
    search_documents.url,
    search_documents.visibility,
    search_documents.tags,
    1 - (search_documents.embedding <=> query_embedding) as similarity
  from public.search_documents
  where search_documents.embedding is not null
  order by search_documents.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

create or replace function public.increment_reputation_field(
  target_user_id text,
  score_delta integer,
  field_name text
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.reputations (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  update public.reputations
  set
    score = score + coalesce(score_delta, 0),
    helpful_answers = helpful_answers + case when field_name = 'helpful_answers' then 1 else 0 end,
    contributions = contributions + case when field_name = 'contributions' then 1 else 0 end,
    mentor_sessions = mentor_sessions + case when field_name = 'mentor_sessions' then 1 else 0 end
  where user_id = target_user_id;
end;
$$;

alter table public.workspace_profiles enable row level security;
alter table public.reputations enable row level security;
alter table public.user_wallets enable row level security;
alter table public.credit_transactions enable row level security;
alter table public.research_clubs enable row level security;
alter table public.paper_sessions enable row level security;
alter table public.lab_projects enable row level security;
alter table public.lab_notebooks enable row level security;
alter table public.resource_vault_items enable row level security;
alter table public.question_bounties enable row level security;
alter table public.bounty_responses enable row level security;
alter table public.events enable row level security;
alter table public.event_registrations enable row level security;
alter table public.campus_chapters enable row level security;
alter table public.chapter_members enable row level security;
alter table public.verification_requests enable row level security;
alter table public.search_documents enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.call_recordings enable row level security;

drop policy if exists "workspace_profiles_select" on public.workspace_profiles;
create policy "workspace_profiles_select" on public.workspace_profiles
for select to authenticated using (is_public or owner_id = public.requesting_user_id());
drop policy if exists "workspace_profiles_insert" on public.workspace_profiles;
create policy "workspace_profiles_insert" on public.workspace_profiles
for insert to authenticated with check (owner_id = public.requesting_user_id());
drop policy if exists "workspace_profiles_update" on public.workspace_profiles;
create policy "workspace_profiles_update" on public.workspace_profiles
for update to authenticated using (owner_id = public.requesting_user_id()) with check (owner_id = public.requesting_user_id());

drop policy if exists "reputations_select" on public.reputations;
create policy "reputations_select" on public.reputations
for select to authenticated using (true);

drop policy if exists "user_wallets_select" on public.user_wallets;
create policy "user_wallets_select" on public.user_wallets
for select to authenticated using (user_id = public.requesting_user_id());
drop policy if exists "user_wallets_insert" on public.user_wallets;
create policy "user_wallets_insert" on public.user_wallets
for insert to authenticated with check (user_id = public.requesting_user_id());
drop policy if exists "user_wallets_update" on public.user_wallets;
create policy "user_wallets_update" on public.user_wallets
for update to authenticated using (user_id = public.requesting_user_id()) with check (user_id = public.requesting_user_id());

drop policy if exists "credit_transactions_select" on public.credit_transactions;
create policy "credit_transactions_select" on public.credit_transactions
for select to authenticated using (user_id = public.requesting_user_id());

drop policy if exists "research_clubs_select" on public.research_clubs;
create policy "research_clubs_select" on public.research_clubs
for select to authenticated using (
  workspace_id is null
  or exists (
    select 1 from public.workspace_profiles wp
    where wp.id = research_clubs.workspace_id
      and (wp.is_public or wp.owner_id = public.requesting_user_id())
  )
);
drop policy if exists "research_clubs_insert" on public.research_clubs;
create policy "research_clubs_insert" on public.research_clubs
for insert to authenticated with check (owner_id = public.requesting_user_id());

drop policy if exists "paper_sessions_select" on public.paper_sessions;
create policy "paper_sessions_select" on public.paper_sessions
for select to authenticated using (true);
drop policy if exists "paper_sessions_insert" on public.paper_sessions;
create policy "paper_sessions_insert" on public.paper_sessions
for insert to authenticated with check (
  exists (
    select 1 from public.research_clubs rc
    where rc.id = paper_sessions.research_club_id
      and rc.owner_id = public.requesting_user_id()
  )
);

drop policy if exists "lab_projects_select" on public.lab_projects;
create policy "lab_projects_select" on public.lab_projects
for select to authenticated using (
  workspace_id is null
  or exists (
    select 1 from public.workspace_profiles wp
    where wp.id = lab_projects.workspace_id
      and (wp.is_public or wp.owner_id = public.requesting_user_id())
  )
  or owner_id = public.requesting_user_id()
);
drop policy if exists "lab_projects_insert" on public.lab_projects;
create policy "lab_projects_insert" on public.lab_projects
for insert to authenticated with check (owner_id = public.requesting_user_id());

drop policy if exists "lab_notebooks_select" on public.lab_notebooks;
create policy "lab_notebooks_select" on public.lab_notebooks
for select to authenticated using (
  visibility = 'public'
  or author_id = public.requesting_user_id()
  or exists (
    select 1 from public.lab_projects lp
    where lp.id = lab_notebooks.lab_project_id
      and lp.owner_id = public.requesting_user_id()
  )
);
drop policy if exists "lab_notebooks_insert" on public.lab_notebooks;
create policy "lab_notebooks_insert" on public.lab_notebooks
for insert to authenticated with check (author_id = public.requesting_user_id());

drop policy if exists "resource_vault_items_select" on public.resource_vault_items;
create policy "resource_vault_items_select" on public.resource_vault_items
for select to authenticated using (visibility in ('public', 'premium') or owner_id = public.requesting_user_id());
drop policy if exists "resource_vault_items_insert" on public.resource_vault_items;
create policy "resource_vault_items_insert" on public.resource_vault_items
for insert to authenticated with check (owner_id = public.requesting_user_id());

drop policy if exists "question_bounties_select" on public.question_bounties;
create policy "question_bounties_select" on public.question_bounties
for select to authenticated using (true);
drop policy if exists "question_bounties_insert" on public.question_bounties;
create policy "question_bounties_insert" on public.question_bounties
for insert to authenticated with check (author_id = public.requesting_user_id());
drop policy if exists "question_bounties_update" on public.question_bounties;
create policy "question_bounties_update" on public.question_bounties
for update to authenticated using (author_id = public.requesting_user_id()) with check (author_id = public.requesting_user_id());

drop policy if exists "bounty_responses_select" on public.bounty_responses;
create policy "bounty_responses_select" on public.bounty_responses
for select to authenticated using (true);
drop policy if exists "bounty_responses_insert" on public.bounty_responses;
create policy "bounty_responses_insert" on public.bounty_responses
for insert to authenticated with check (author_id = public.requesting_user_id());

drop policy if exists "events_select" on public.events;
create policy "events_select" on public.events
for select to authenticated using (true);
drop policy if exists "events_insert" on public.events;
create policy "events_insert" on public.events
for insert to authenticated with check (organizer_id = public.requesting_user_id());

drop policy if exists "event_registrations_select" on public.event_registrations;
create policy "event_registrations_select" on public.event_registrations
for select to authenticated using (user_id = public.requesting_user_id());
drop policy if exists "event_registrations_insert" on public.event_registrations;
create policy "event_registrations_insert" on public.event_registrations
for insert to authenticated with check (user_id = public.requesting_user_id());

drop policy if exists "chapter_members_select" on public.chapter_members;
create policy "chapter_members_select" on public.chapter_members
for select to authenticated using (true);
drop policy if exists "chapter_members_insert" on public.chapter_members;
create policy "chapter_members_insert" on public.chapter_members
for insert to authenticated with check (user_id = public.requesting_user_id());

drop policy if exists "campus_chapters_select" on public.campus_chapters;
create policy "campus_chapters_select" on public.campus_chapters
for select to authenticated using (true);
drop policy if exists "campus_chapters_insert" on public.campus_chapters;
create policy "campus_chapters_insert" on public.campus_chapters
for insert to authenticated with check (lead_user_id = public.requesting_user_id());

drop policy if exists "verification_requests_select" on public.verification_requests;
create policy "verification_requests_select" on public.verification_requests
for select to authenticated using (user_id = public.requesting_user_id());
drop policy if exists "verification_requests_insert" on public.verification_requests;
create policy "verification_requests_insert" on public.verification_requests
for insert to authenticated with check (user_id = public.requesting_user_id());

drop policy if exists "search_documents_select" on public.search_documents;
create policy "search_documents_select" on public.search_documents
for select to authenticated using (visibility in ('public', 'premium') or owner_id = public.requesting_user_id());

drop policy if exists "ai_conversations_select" on public.ai_conversations;
create policy "ai_conversations_select" on public.ai_conversations
for select to authenticated using (user_id = public.requesting_user_id());

drop policy if exists "ai_messages_select" on public.ai_messages;
create policy "ai_messages_select" on public.ai_messages
for select to authenticated using (
  exists (
    select 1 from public.ai_conversations ac
    where ac.id = ai_messages.conversation_id
      and ac.user_id = public.requesting_user_id()
  )
);

drop policy if exists "call_recordings_select" on public.call_recordings;
create policy "call_recordings_select" on public.call_recordings
for select to authenticated using (is_public or created_by = public.requesting_user_id());
drop policy if exists "call_recordings_insert" on public.call_recordings;
create policy "call_recordings_insert" on public.call_recordings
for insert to authenticated with check (created_by = public.requesting_user_id());
