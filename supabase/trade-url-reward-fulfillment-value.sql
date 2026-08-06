-- ============================================================
-- STRAFE CRATE: TRADE-URL-ONLY + REWARD FULFILLMENT + VALUE MODEL
-- Run as a NEW query in Supabase SQL Editor.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ONLY THE STEAM TRADE URL IS REQUIRED.
-- ------------------------------------------------------------

create or replace function public.refresh_profile_fulfillment_ready()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.steam_profile_url := nullif(trim(new.steam_profile_url), '');
  new.steam_trade_url := nullif(trim(new.steam_trade_url), '');

  new.fulfillment_ready :=
    public.is_valid_steam_trade_url(new.steam_trade_url);

  return new;
end;
$$;

drop trigger if exists refresh_profile_fulfillment_ready_trigger
on public.profiles;

create trigger refresh_profile_fulfillment_ready_trigger
before insert or update of steam_profile_url, steam_trade_url
on public.profiles
for each row
execute function public.refresh_profile_fulfillment_ready();

update public.profiles
set fulfillment_ready =
  public.is_valid_steam_trade_url(steam_trade_url);

create or replace function public.update_my_fulfillment_profile(
  new_full_name text,
  new_display_name text,
  new_steam_profile_url text,
  new_steam_trade_url text
)
returns table (
  full_name text,
  display_name text,
  steam_profile_url text,
  steam_trade_url text,
  fulfillment_ready boolean
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  profile_id uuid := auth.uid();
  clean_profile_url text := nullif(trim(new_steam_profile_url), '');
  clean_trade_url text := nullif(trim(new_steam_trade_url), '');
begin
  if profile_id is null then
    raise exception 'Authentication required.';
  end if;

  if clean_trade_url is not null
     and not public.is_valid_steam_trade_url(clean_trade_url) then
    raise exception 'Enter a valid Steam trade URL.';
  end if;

  update public.profiles p
  set
    full_name = nullif(trim(new_full_name), ''),
    display_name = nullif(trim(new_display_name), ''),
    steam_profile_url = clean_profile_url,
    steam_trade_url = clean_trade_url
  where p.id = profile_id;

  return query
  select
    p.full_name,
    p.display_name,
    p.steam_profile_url,
    p.steam_trade_url,
    p.fulfillment_ready
  from public.profiles p
  where p.id = profile_id;
end;
$$;

revoke all
on function public.update_my_fulfillment_profile(text,text,text,text)
from public, anon;

grant execute
on function public.update_my_fulfillment_profile(text,text,text,text)
to authenticated;

create or replace function public.require_fulfillment_ready_profile()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  member_ready boolean;
begin
  if new.status::text in (
    'purchasing',
    'ready_to_send',
    'trade_sent',
    'accepted',
    'fulfilled',
    'completed'
  ) then
    select p.fulfillment_ready
    into member_ready
    from public.profiles p
    where p.id = new.user_id;

    if coalesce(member_ready, false) = false then
      raise exception
        'This member must save a valid Steam trade URL before fulfillment can continue.';
    end if;
  end if;

  return new;
end;
$$;

-- ------------------------------------------------------------
-- 2. FULFILLMENT VALUE MODEL.
-- Membership value is editable. Cost is the skin acquisition cost.
-- Reward orders default to $0 revenue and therefore reduce profit by cost.
-- ------------------------------------------------------------

alter table public.fulfillment_orders
add column if not exists membership_value numeric(10,2);

alter table public.fulfillment_orders
add column if not exists order_type text not null default 'membership';

alter table public.fulfillment_orders
add column if not exists reward_redemption_id uuid;

alter table public.reward_redemptions
add column if not exists fulfillment_order_id uuid;

update public.fulfillment_orders fo
set membership_value = coalesce(
  fo.membership_value,
  (
    select mt.monthly_price_cents::numeric / 100
    from public.membership_tiers mt
    where lower(mt.name) = lower(fo.tier_name)
    limit 1
  ),
  0
)
where fo.membership_value is null;

create or replace function public.default_fulfillment_membership_value()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.order_type = 'reward' then
    new.membership_value := coalesce(new.membership_value, 0);
  elsif new.membership_value is null then
    select mt.monthly_price_cents::numeric / 100
    into new.membership_value
    from public.membership_tiers mt
    where lower(mt.name) = lower(new.tier_name)
    limit 1;

    new.membership_value := coalesce(new.membership_value, 0);
  end if;

  return new;
end;
$$;

drop trigger if exists default_fulfillment_membership_value_trigger
on public.fulfillment_orders;

create trigger default_fulfillment_membership_value_trigger
before insert or update of tier_name, membership_value, order_type
on public.fulfillment_orders
for each row
execute function public.default_fulfillment_membership_value();

-- ------------------------------------------------------------
-- 3. REDEEMING CREDITS CREATES A STANDALONE REWARD ORDER.
-- ------------------------------------------------------------

create or replace function public.redeem_reward(reward_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  selected_reward public.reward_catalog;
  current_credits integer;
  member_ready boolean;
  redemption_id uuid;
  fulfillment_id uuid;
  current_cycle date := date_trunc('month', current_date)::date;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select p.fulfillment_ready
  into member_ready
  from public.profiles p
  where p.id = current_user_id;

  if coalesce(member_ready, false) = false then
    raise exception 'Save a valid Steam trade URL before redeeming a reward.';
  end if;

  select * into selected_reward
  from public.reward_catalog
  where slug = reward_slug
    and active = true;

  if selected_reward.id is null then
    raise exception 'Reward is not currently available.';
  end if;

  select supply_credits into current_credits
  from public.loyalty_accounts
  where user_id = current_user_id
  for update;

  if coalesce(current_credits, 0) < selected_reward.credits_required then
    raise exception 'Not enough Supply Credits.';
  end if;

  update public.loyalty_accounts
  set
    supply_credits = supply_credits - selected_reward.credits_required,
    updated_at = now()
  where user_id = current_user_id;

  insert into public.credit_ledger(user_id, amount, reason, source_id)
  values (
    current_user_id,
    -selected_reward.credits_required,
    'Reward redemption: ' || selected_reward.name,
    'reward:' || gen_random_uuid()::text
  );

  insert into public.reward_redemptions(
    user_id,
    reward_id,
    credits_spent
  )
  values (
    current_user_id,
    selected_reward.id,
    selected_reward.credits_required
  )
  returning id into redemption_id;

  insert into public.fulfillment_orders(
    user_id,
    status,
    cycle_month,
    billing_cycle,
    delivery_due_date,
    tier_name,
    weapon_category,
    skin_name,
    exterior,
    membership_value,
    acquisition_cost,
    admin_notes,
    is_test,
    order_type,
    reward_redemption_id
  )
  values (
    current_user_id,
    'draft',
    current_cycle,
    current_cycle,
    current_date + 13,
    'Reward',
    null,
    'Reward',
    'Reward',
    0,
    null,
    selected_reward.name || ' · ' || selected_reward.credits_required || ' Supply Credits',
    false,
    'reward',
    redemption_id
  )
  returning id into fulfillment_id;

  update public.reward_redemptions
  set fulfillment_order_id = fulfillment_id
  where id = redemption_id;

  return redemption_id;
end;
$$;

revoke all on function public.redeem_reward(text)
from public, anon;

grant execute on function public.redeem_reward(text)
to authenticated;

-- ------------------------------------------------------------
-- 4. ADMIN QUEUE RETURNS MEMBERSHIP VALUE + REWARD SOURCE.
-- ------------------------------------------------------------

drop function if exists public.get_admin_fulfillment_orders();

create function public.get_admin_fulfillment_orders()
returns table (
  order_id uuid,
  user_id uuid,
  display_name text,
  email text,
  cycle_month date,
  tier_name text,
  weapon_category text,
  skin_name text,
  exterior text,
  membership_value numeric,
  acquisition_cost numeric,
  trade_offer_url text,
  trade_offer_id text,
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  trade_sent_at timestamptz,
  fulfilled_at timestamptz,
  order_type text
)
language sql
volatile
security definer
set search_path = public
set row_security = off
as $$
  select
    fo.id,
    fo.user_id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      split_part(p.email, '@', 1),
      'Member'
    ),
    p.email,
    fo.cycle_month,
    fo.tier_name,
    fo.weapon_category,
    fo.skin_name,
    fo.exterior,
    fo.membership_value,
    fo.acquisition_cost,
    coalesce(
      nullif(trim(fo.trade_offer_url), ''),
      nullif(trim(p.steam_trade_url), '')
    ),
    fo.trade_offer_id,
    fo.status::text,
    fo.admin_notes,
    fo.created_at,
    fo.updated_at,
    fo.trade_sent_at,
    fo.fulfilled_at,
    fo.order_type
  from public.fulfillment_orders fo
  join public.profiles p
    on p.id = fo.user_id
  where public.is_admin()
  order by
    case fo.status::text
      when 'draft' then 0
      when 'purchasing' then 1
      when 'ready_to_send' then 2
      when 'trade_sent' then 3
      when 'accepted' then 4
      when 'fulfilled' then 5
      when 'completed' then 5
      else 6
    end,
    fo.created_at desc;
$$;

revoke all on function public.get_admin_fulfillment_orders()
from public, anon;

grant execute on function public.get_admin_fulfillment_orders()
to authenticated;

-- ------------------------------------------------------------
-- 5. BUSINESS METRICS USE EDITABLE MEMBERSHIP VALUE.
-- ------------------------------------------------------------

create or replace function public.get_admin_business_metrics()
returns table (
  period_key text,
  revenue_cents bigint,
  cost_cents bigint,
  profit_cents bigint,
  order_count bigint
)
language sql
volatile
security definer
set search_path = public
set row_security = off
as $$
  with valid_orders as (
    select
      fo.id,
      coalesce(
        fo.cycle_month,
        date_trunc('month', fo.created_at)::date
      ) as effective_cycle,
      round(coalesce(fo.membership_value, 0) * 100)::bigint as order_revenue_cents,
      round(coalesce(fo.acquisition_cost, 0) * 100)::bigint as order_cost_cents
    from public.fulfillment_orders fo
    where coalesce(fo.is_test, false) = false
      and fo.status::text not in (
        'payment_failed',
        'failed',
        'cancelled',
        'declined',
        'expired',
        'issue'
      )
  ),
  periods(period_key, start_date) as (
    values
      ('current_month'::text, date_trunc('month', current_date)::date),
      ('fiscal_year'::text, date_trunc('year', current_date)::date),
      ('lifetime'::text, date '1900-01-01')
  )
  select
    period.period_key,
    coalesce(sum(valid.order_revenue_cents), 0)::bigint,
    coalesce(sum(valid.order_cost_cents), 0)::bigint,
    coalesce(sum(valid.order_revenue_cents - valid.order_cost_cents), 0)::bigint,
    count(valid.id)::bigint
  from periods period
  left join valid_orders valid
    on valid.effective_cycle >= period.start_date
  group by period.period_key
  order by
    case period.period_key
      when 'current_month' then 1
      when 'fiscal_year' then 2
      else 3
    end;
$$;

revoke all on function public.get_admin_business_metrics()
from public, anon;

grant execute on function public.get_admin_business_metrics()
to authenticated;

notify pgrst, 'reload schema';

select
  to_regprocedure('public.redeem_reward(text)') as reward_redemption,
  to_regprocedure('public.get_admin_fulfillment_orders()') as fulfillment_queue,
  to_regprocedure('public.get_admin_business_metrics()') as business_metrics;
