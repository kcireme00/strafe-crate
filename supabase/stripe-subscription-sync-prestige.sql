-- ============================================================
-- STRAFE CRATE: STRIPE SUBSCRIPTION SYNC + AUTO PRESTIGE
-- Run as a NEW query after the existing Strafe Crate migrations.
-- ============================================================

create extension if not exists pgcrypto;

-- Stripe identifiers and synchronization state.
alter table public.profiles
add column if not exists stripe_customer_id text;

create unique index if not exists profiles_stripe_customer_id_key
on public.profiles(stripe_customer_id)
where stripe_customer_id is not null;

alter table public.subscriptions
add column if not exists stripe_customer_id text;

alter table public.subscriptions
add column if not exists stripe_subscription_id text;

alter table public.subscriptions
add column if not exists stripe_price_id text;

alter table public.subscriptions
add column if not exists current_period_start timestamptz;

alter table public.subscriptions
add column if not exists current_period_end timestamptz;

alter table public.subscriptions
add column if not exists cancel_at_period_end boolean not null default false;

alter table public.subscriptions
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists subscriptions_user_id_key
on public.subscriptions(user_id);

create unique index if not exists subscriptions_stripe_subscription_id_key
on public.subscriptions(stripe_subscription_id)
where stripe_subscription_id is not null;

alter table public.fulfillment_orders
add column if not exists stripe_invoice_id text;

alter table public.fulfillment_orders
add column if not exists membership_value numeric(10,2) not null default 0;

alter table public.fulfillment_orders
add column if not exists order_type text not null default 'membership';

alter table public.fulfillment_orders
add column if not exists is_test boolean not null default false;

create unique index if not exists fulfillment_orders_stripe_invoice_id_key
on public.fulfillment_orders(stripe_invoice_id)
where stripe_invoice_id is not null;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

-- Long-term prestige progression.
alter table public.loyalty_accounts
add column if not exists prestige_level integer not null default 0;

alter table public.loyalty_accounts
add column if not exists collections_completed integer not null default 0;

create or replace function public.process_automatic_prestige(
  target_user_id uuid
)
returns table (
  prestiged boolean,
  new_prestige_level integer,
  new_rotation_cycle integer,
  xp_awarded integer,
  credits_awarded integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_rotation integer := 1;
  active_weapon_count integer := 0;
  completed_weapon_count integer := 0;
  resulting_prestige integer := 0;
  xp_bonus integer := 500;
  credit_bonus integer := 10;
begin
  insert into public.member_rotation_state(user_id, current_cycle)
  values (target_user_id, 1)
  on conflict (user_id) do nothing;

  select state.current_cycle
  into current_rotation
  from public.member_rotation_state state
  where state.user_id = target_user_id
  for update;

  select count(*)::integer
  into active_weapon_count
  from public.weapon_catalog catalog
  where catalog.active = true;

  select count(distinct lower(orders.weapon_category))::integer
  into completed_weapon_count
  from public.fulfillment_orders orders
  where orders.user_id = target_user_id
    and orders.rotation_cycle = current_rotation
    and orders.weapon_category is not null
    and coalesce(orders.order_type, 'membership') = 'membership'
    and orders.status::text in ('accepted', 'fulfilled', 'completed');

  if active_weapon_count = 0
     or completed_weapon_count < active_weapon_count then
    select coalesce(account.prestige_level, 0)
    into resulting_prestige
    from public.loyalty_accounts account
    where account.user_id = target_user_id;

    return query
    select false, coalesce(resulting_prestige, 0), current_rotation, 0, 0;
    return;
  end if;

  insert into public.loyalty_accounts(user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  update public.loyalty_accounts account
  set
    prestige_level = account.prestige_level + 1,
    collections_completed = account.collections_completed + 1,
    lifetime_xp = account.lifetime_xp + xp_bonus,
    supply_credits = account.supply_credits + credit_bonus,
    updated_at = now()
  where account.user_id = target_user_id
  returning account.prestige_level into resulting_prestige;

  update public.member_rotation_state state
  set
    current_cycle = current_rotation + 1,
    updated_at = now()
  where state.user_id = target_user_id;

  insert into public.xp_ledger(user_id, amount, reason, source_id)
  values (
    target_user_id,
    xp_bonus,
    'Automatic collection prestige reward',
    'prestige-xp-' || target_user_id::text || '-' || current_rotation::text
  )
  on conflict (source_id) do nothing;

  insert into public.credit_ledger(user_id, amount, reason, source_id)
  values (
    target_user_id,
    credit_bonus,
    'Automatic collection prestige reward',
    'prestige-credit-' || target_user_id::text || '-' || current_rotation::text
  )
  on conflict (source_id) do nothing;

  return query
  select true, resulting_prestige, current_rotation + 1, xp_bonus, credit_bonus;
end;
$$;

revoke all on function public.process_automatic_prestige(uuid)
from public, anon, authenticated;

grant execute on function public.process_automatic_prestige(uuid)
to service_role;

-- Member-facing prestige state for dashboard/player cards.
create or replace function public.get_my_prestige_state()
returns table (
  prestige_level integer,
  collections_completed integer,
  current_rotation integer
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    coalesce(account.prestige_level, 0),
    coalesce(account.collections_completed, 0),
    coalesce(state.current_cycle, 1)
  from public.profiles profile
  left join public.loyalty_accounts account
    on account.user_id = profile.id
  left join public.member_rotation_state state
    on state.user_id = profile.id
  where profile.id = auth.uid();
$$;

revoke all on function public.get_my_prestige_state()
from public, anon;

grant execute on function public.get_my_prestige_state()
to authenticated;

notify pgrst, 'reload schema';

select
  to_regclass('public.stripe_webhook_events') as webhook_events,
  to_regprocedure('public.process_automatic_prestige(uuid)') as auto_prestige,
  to_regprocedure('public.get_my_prestige_state()') as prestige_state;
