do $$
begin
  if not exists (select 1 from pg_type where typname = 'email_delivery_status') then
    create type email_delivery_status as enum ('queued', 'sent', 'failed');
  end if;
end$$;

create table if not exists public.email_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id text,
  recipient_email text not null,
  template_key text not null,
  subject text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status email_delivery_status not null default 'queued',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_email_deliveries_user foreign key (user_id) references public.profiles(clerk_user_id) on delete set null
);

create table if not exists public.backup_manifests (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  object_key text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_deliveries_created_at on public.email_deliveries (created_at desc);
create index if not exists idx_email_deliveries_user on public.email_deliveries (user_id, created_at desc);
create index if not exists idx_backup_manifests_created_at on public.backup_manifests (created_at desc);

drop trigger if exists trg_email_deliveries_updated_at on public.email_deliveries;
create trigger trg_email_deliveries_updated_at before update on public.email_deliveries for each row execute function public.set_updated_at();

alter table public.email_deliveries enable row level security;
alter table public.backup_manifests enable row level security;

drop policy if exists "Users can view their email deliveries" on public.email_deliveries;
create policy "Users can view their email deliveries"
on public.email_deliveries
for select
to authenticated
using (user_id = public.requesting_user_id());

drop policy if exists "backup_manifests_no_direct_access" on public.backup_manifests;
create policy "backup_manifests_no_direct_access"
on public.backup_manifests
for select
to authenticated
using (false);
