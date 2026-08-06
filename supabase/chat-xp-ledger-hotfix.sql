-- Strafe Crate chat XP ledger hotfix
-- Safe to run even if some loyalty tables already exist.

begin;

create extension if not exists pgcrypto;

create table if not exists public.loyalty_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lifetime_xp bigint not null default 0 check (lifetime_xp >= 0),
  supply_credits integer not null default 0 check (supply_credits >= 0),
  consecutive_paid_months integer not null default 0 check (consecutive_paid_months >= 0),
  xp_multiplier numeric(4,2) not null default 1.00,
  updated_at timestamptz not null default now()
);

alter table public.loyalty_accounts
add column if not exists lifetime_xp bigint not null default 0;

alter table public.loyalty_accounts
add column if not exists supply_credits integer not null default 0;

alter table public.loyalty_accounts
add column if not exists consecutive_paid_months integer not null default 0;

alter table public.loyalty_accounts
add column if not exists xp_multiplier numeric(4,2) not null default 1.00;

alter table public.loyalty_accounts
add column if not exists updated_at timestamptz not null default now();

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  source_id text unique,
  created_at timestamptz not null default now()
);

create unique index if not exists xp_ledger_source_id_key
on public.xp_ledger(source_id)
where source_id is not null;

insert into public.loyalty_accounts(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_loyalty_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.loyalty_accounts(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_create_loyalty
on public.profiles;

create trigger on_profile_created_create_loyalty
after insert on public.profiles
for each row execute function public.handle_new_loyalty_account();

-- Reinstall the chat-progress trigger now that its ledger dependency exists.
drop trigger if exists award_chat_progress_trigger
on public.chat_messages;

create trigger award_chat_progress_trigger
after insert on public.chat_messages
for each row execute function public.award_chat_progress();

commit;

notify pgrst, 'reload schema';

select
  to_regclass('public.loyalty_accounts') is not null as loyalty_accounts_ready,
  to_regclass('public.xp_ledger') is not null as xp_ledger_ready,
  to_regprocedure('public.award_chat_progress()') is not null as chat_xp_function_ready;
