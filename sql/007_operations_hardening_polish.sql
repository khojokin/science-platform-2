do $$
begin
  if not exists (select 1 from pg_type where typname = 'job_status') then
    create type job_status as enum ('queued', 'running', 'completed', 'failed');
  end if;
end$$;

create table if not exists public.request_rate_limits (
  id uuid primary key default gen_random_uuid(),
  bucket_key text not null,
  action text not null,
  user_id text,
  route text,
  ip_hash text,
  created_at timestamptz not null default now(),
  constraint fk_request_rate_limits_user foreign key (user_id) references public.profiles(clerk_user_id) on delete cascade
);

create table if not exists public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text not null default '',
  updated_by text,
  updated_at timestamptz not null default now(),
  constraint fk_feature_flags_updated_by foreign key (updated_by) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  external_id text,
  signature_valid boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz,
  received_at timestamptz not null default now()
);

create table if not exists public.job_queue (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  status job_status not null default 'queued',
  payload jsonb not null default '{}'::jsonb,
  attempts integer not null default 0,
  run_after timestamptz not null default now(),
  locked_at timestamptz,
  locked_by text,
  error_message text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  event_name text not null,
  session_key text,
  path text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint fk_analytics_events_user foreign key (user_id) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.analytics_daily (
  day date primary key,
  signups_count integer not null default 0,
  posts_count integer not null default 0,
  messages_count integer not null default 0,
  events_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_request_rate_limits_bucket_created_at on public.request_rate_limits (bucket_key, created_at desc);
create index if not exists idx_request_rate_limits_action_created_at on public.request_rate_limits (action, created_at desc);
create index if not exists idx_webhook_events_provider_received_at on public.webhook_events (provider, received_at desc);
create index if not exists idx_job_queue_status_run_after on public.job_queue (status, run_after asc);
create index if not exists idx_analytics_events_created_at on public.analytics_events (created_at desc);
create index if not exists idx_analytics_events_event_name_created_at on public.analytics_events (event_name, created_at desc);

drop trigger if exists trg_feature_flags_updated_at on public.feature_flags;
create trigger trg_feature_flags_updated_at before update on public.feature_flags for each row execute function public.set_updated_at();

drop trigger if exists trg_job_queue_updated_at on public.job_queue;
create trigger trg_job_queue_updated_at before update on public.job_queue for each row execute function public.set_updated_at();

drop trigger if exists trg_analytics_daily_updated_at on public.analytics_daily;
create trigger trg_analytics_daily_updated_at before update on public.analytics_daily for each row execute function public.set_updated_at();

alter table public.request_rate_limits enable row level security;
alter table public.feature_flags enable row level security;
alter table public.webhook_events enable row level security;
alter table public.job_queue enable row level security;
alter table public.analytics_events enable row level security;
alter table public.analytics_daily enable row level security;

drop policy if exists "Users can insert their analytics events" on public.analytics_events;
create policy "Users can insert their analytics events"
on public.analytics_events
for insert
to authenticated
with check (user_id is null or user_id = public.requesting_user_id());

drop policy if exists "Users can view their analytics events" on public.analytics_events;
create policy "Users can view their analytics events"
on public.analytics_events
for select
to authenticated
using (user_id = public.requesting_user_id());

create or replace function public.claim_due_jobs(worker_name text, batch_size integer default 10)
returns setof public.job_queue
language plpgsql
security definer
as $$
declare
  claimed_ids uuid[];
begin
  with candidates as (
    select id
    from public.job_queue
    where status = 'queued'
      and run_after <= now()
    order by run_after asc, created_at asc
    limit greatest(batch_size, 1)
    for update skip locked
  ),
  updated as (
    update public.job_queue
    set status = 'running',
        attempts = attempts + 1,
        locked_at = now(),
        locked_by = worker_name,
        updated_at = now()
    where id in (select id from candidates)
    returning *
  )
  select coalesce(array_agg(id), '{}'::uuid[]) into claimed_ids from updated;

  if array_length(claimed_ids, 1) is null then
    return;
  end if;

  return query
  select *
  from public.job_queue
  where id = any(claimed_ids)
  order by created_at asc;
end;
$$;

create or replace function public.refresh_daily_analytics()
returns void
language plpgsql
security definer
as $$
begin
  insert into public.analytics_daily (day, signups_count, posts_count, messages_count, events_count)
  select source.day,
         source.signups_count,
         source.posts_count,
         source.messages_count,
         source.events_count
  from (
    select days.day::date as day,
      coalesce(signups.cnt, 0) as signups_count,
      coalesce(posts.cnt, 0) as posts_count,
      coalesce(messages.cnt, 0) as messages_count,
      coalesce(events.cnt, 0) as events_count
    from generate_series((current_date - interval '13 days')::date, current_date, interval '1 day') as days(day)
    left join (
      select date(created_at) as day, count(*) as cnt
      from public.profiles
      group by 1
    ) signups on signups.day = days.day::date
    left join (
      select date(created_at) as day, count(*) as cnt
      from public.posts
      group by 1
    ) posts on posts.day = days.day::date
    left join (
      select date(created_at) as day, count(*) as cnt
      from public.messages
      group by 1
    ) messages on messages.day = days.day::date
    left join (
      select date(created_at) as day, count(*) as cnt
      from public.events
      group by 1
    ) events on events.day = days.day::date
  ) as source
  on conflict (day) do update
  set signups_count = excluded.signups_count,
      posts_count = excluded.posts_count,
      messages_count = excluded.messages_count,
      events_count = excluded.events_count,
      updated_at = now();
end;
$$;

create or replace function public.cleanup_operational_tables()
returns void
language plpgsql
security definer
as $$
begin
  delete from public.request_rate_limits where created_at < now() - interval '14 days';
  delete from public.analytics_events where created_at < now() - interval '90 days';
  delete from public.job_queue where status in ('completed', 'failed') and created_at < now() - interval '30 days';
  delete from public.webhook_events where received_at < now() - interval '30 days';
end;
$$;
