-- Strafe Crate September 1, 2026 launch sponsorship event
-- Run once in Supabase SQL Editor after deploying the matching repository.

begin;

create extension if not exists pgcrypto;

insert into public.trophy_definitions (
  slug,
  name,
  description,
  icon,
  rarity,
  active
)
values (
  'launch-sand-dollar',
  'Sand Dollar',
  'Exclusive launch-event trophy awarded for promoting StrafeCrate.com in a Steam username.',
  '◉',
  'legendary',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  rarity = excluded.rarity,
  active = true;

create table if not exists public.launch_event_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique
    references public.profiles(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','approved','fulfilled','rejected')),
  claimed_at timestamptz not null default now(),
  verified_at timestamptz,
  verified_by uuid references public.profiles(id) on delete set null,
  reward_order_id uuid references public.fulfillment_orders(id) on delete set null,
  admin_notes text,
  updated_at timestamptz not null default now()
);

create index if not exists launch_event_claims_status_idx
on public.launch_event_claims(status, claimed_at desc);

alter table public.launch_event_claims enable row level security;

grant select on public.launch_event_claims to authenticated;

drop policy if exists "Members view own launch claim"
on public.launch_event_claims;
create policy "Members view own launch claim"
on public.launch_event_claims
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage launch claims"
on public.launch_event_claims;
create policy "Admins manage launch claims"
on public.launch_event_claims
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.submit_launch_event_claim()
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  trade_url text;
  claim_id uuid;
begin
  if current_user_id is null then
    raise exception 'Please sign in before claiming the event reward.';
  end if;

  if now() > timestamptz '2026-09-02 06:59:59+00' then
    raise exception 'This event ended September 1, 2026.';
  end if;

  select nullif(trim(p.steam_trade_url), '')
  into trade_url
  from public.profiles p
  where p.id = current_user_id;

  if trade_url is null then
    raise exception 'Save a valid Steam Trade URL in Settings before claiming.';
  end if;

  insert into public.launch_event_claims(user_id, status, claimed_at, updated_at)
  values (current_user_id, 'pending', now(), now())
  on conflict (user_id) do update set
    status = case
      when public.launch_event_claims.status = 'rejected' then 'pending'
      else public.launch_event_claims.status
    end,
    claimed_at = case
      when public.launch_event_claims.status = 'rejected' then now()
      else public.launch_event_claims.claimed_at
    end,
    updated_at = now()
  returning id into claim_id;

  return claim_id;
end;
$$;

revoke all on function public.submit_launch_event_claim()
from public, anon;
grant execute on function public.submit_launch_event_claim()
to authenticated;

create or replace function public.get_launch_event_participant_count()
returns bigint
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select count(*)::bigint
  from public.launch_event_claims
  where status in ('pending','approved','fulfilled');
$$;

revoke all on function public.get_launch_event_participant_count()
from public, anon;
grant execute on function public.get_launch_event_participant_count()
to authenticated, anon;

create or replace function public.get_admin_launch_event_claims()
returns table (
  claim_id uuid,
  user_id uuid,
  display_name text,
  email text,
  steam_profile_url text,
  steam_trade_url text,
  status text,
  claimed_at timestamptz,
  verified_at timestamptz,
  reward_order_id uuid
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    c.id,
    c.user_id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      split_part(p.email, '@', 1),
      'Member'
    ),
    p.email,
    p.steam_profile_url,
    p.steam_trade_url,
    c.status,
    c.claimed_at,
    c.verified_at,
    c.reward_order_id
  from public.launch_event_claims c
  join public.profiles p on p.id = c.user_id
  where public.is_admin()
  order by
    case c.status
      when 'pending' then 1
      when 'approved' then 2
      when 'fulfilled' then 3
      else 4
    end,
    c.claimed_at asc;
$$;

revoke all on function public.get_admin_launch_event_claims()
from public, anon;
grant execute on function public.get_admin_launch_event_claims()
to authenticated;

create or replace function public.admin_process_launch_event_claim(
  target_claim_id uuid,
  claim_action text
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  claim_row public.launch_event_claims%rowtype;
  profile_trade_url text;
  trophy_id uuid;
  created_order_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  select *
  into claim_row
  from public.launch_event_claims
  where id = target_claim_id
  for update;

  if not found then
    raise exception 'Event claim not found.';
  end if;

  if claim_action = 'reject' then
    update public.launch_event_claims
    set
      status = 'rejected',
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
    where id = target_claim_id;

    return null;
  end if;

  if claim_action <> 'approve' then
    raise exception 'Unsupported event action.';
  end if;

  select nullif(trim(p.steam_trade_url), '')
  into profile_trade_url
  from public.profiles p
  where p.id = claim_row.user_id;

  if profile_trade_url is null then
    raise exception 'This member must save a valid Steam Trade URL first.';
  end if;

  select id
  into trophy_id
  from public.trophy_definitions
  where slug = 'launch-sand-dollar'
  limit 1;

  if trophy_id is null then
    raise exception 'Sand Dollar trophy definition is missing.';
  end if;

  insert into public.member_trophies(user_id, trophy_id)
  values (claim_row.user_id, trophy_id)
  on conflict (user_id, trophy_id) do nothing;

  if claim_row.reward_order_id is null then
    insert into public.fulfillment_orders(
      user_id,
      cycle_month,
      tier_name,
      weapon_category,
      skin_name,
      exterior,
      steam_reference_value,
      acquisition_cost,
      status,
      admin_notes,
      created_by
    )
    values (
      claim_row.user_id,
      date '2026-09-01',
      'Event Reward',
      'P250',
      'Sand Dune',
      'Admin choice',
      0,
      0,
      'draft',
      'September 2026 launch sponsorship reward. Verify Steam username includes StrafeCrate.com before sending.',
      auth.uid()
    )
    returning id into created_order_id;
  else
    created_order_id := claim_row.reward_order_id;
  end if;

  update public.launch_event_claims
  set
    status = 'approved',
    verified_by = auth.uid(),
    verified_at = now(),
    reward_order_id = created_order_id,
    updated_at = now()
  where id = target_claim_id;

  return created_order_id;
end;
$$;

revoke all on function public.admin_process_launch_event_claim(uuid,text)
from public, anon;
grant execute on function public.admin_process_launch_event_claim(uuid,text)
to authenticated;

create or replace function public.sync_launch_event_claim_from_fulfillment()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if new.status in ('trade_sent','accepted','fulfilled') then
    update public.launch_event_claims
    set
      status = 'fulfilled',
      updated_at = now()
    where reward_order_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_launch_event_claim_from_fulfillment_trigger
on public.fulfillment_orders;

create trigger sync_launch_event_claim_from_fulfillment_trigger
after update of status on public.fulfillment_orders
for each row
execute function public.sync_launch_event_claim_from_fulfillment();

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.launch_event_claims') is not null as claims_ready,
  to_regprocedure('public.submit_launch_event_claim()') is not null as submit_ready,
  to_regprocedure('public.get_admin_launch_event_claims()') is not null as admin_ready;
