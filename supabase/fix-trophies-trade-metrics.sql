-- ============================================================
-- STRAFE CRATE: TROPHY SLOT, STEAM TRADE LINK, METRICS REFRESH
-- Run as a NEW Supabase SQL query.
-- ============================================================

-- 1. Fix PL/pgSQL output-column ambiguity while preserving exact slots.
create or replace function public.set_my_featured_trophy_slots(
  slot_1_trophy_id uuid,
  slot_2_trophy_id uuid,
  slot_3_trophy_id uuid
)
returns table (
  trophy_id uuid,
  featured_slot smallint
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  selected_ids uuid[];
  selected_count integer;
  owned_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  selected_ids := array_remove(
    array[slot_1_trophy_id, slot_2_trophy_id, slot_3_trophy_id]::uuid[],
    null
  );

  selected_count := cardinality(selected_ids);

  if (
    select count(distinct selected.selected_id)
    from unnest(selected_ids) as selected(selected_id)
  ) <> selected_count then
    raise exception 'The same trophy cannot be featured in more than one slot.';
  end if;

  select count(*)
  into owned_count
  from public.member_trophies as owned
  where owned.user_id = current_user_id
    and owned.trophy_id = any(selected_ids);

  if owned_count <> selected_count then
    raise exception 'You may only feature trophies unlocked by your account.';
  end if;

  update public.member_trophies as existing
  set featured_slot = null
  where existing.user_id = current_user_id
    and existing.featured_slot is not null;

  if slot_1_trophy_id is not null then
    update public.member_trophies as slot_one
    set featured_slot = 1
    where slot_one.user_id = current_user_id
      and slot_one.trophy_id = slot_1_trophy_id;
  end if;

  if slot_2_trophy_id is not null then
    update public.member_trophies as slot_two
    set featured_slot = 2
    where slot_two.user_id = current_user_id
      and slot_two.trophy_id = slot_2_trophy_id;
  end if;

  if slot_3_trophy_id is not null then
    update public.member_trophies as slot_three
    set featured_slot = 3
    where slot_three.user_id = current_user_id
      and slot_three.trophy_id = slot_3_trophy_id;
  end if;

  return query
  select
    saved.trophy_id,
    saved.featured_slot
  from public.member_trophies as saved
  where saved.user_id = current_user_id
    and saved.featured_slot is not null
  order by saved.featured_slot;
end;
$$;

revoke all
on function public.set_my_featured_trophy_slots(uuid, uuid, uuid)
from public, anon;

grant execute
on function public.set_my_featured_trophy_slots(uuid, uuid, uuid)
to authenticated;

-- 2. Return the member's SAVED Steam trade URL in the fulfillment queue.
-- The existing frontend field is trade_offer_url, so no additional API shape
-- is needed. An order-specific URL still wins when one was explicitly saved.
create or replace function public.get_admin_fulfillment_orders()
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
  steam_reference_value numeric,
  acquisition_cost numeric,
  trade_offer_url text,
  trade_offer_id text,
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  trade_sent_at timestamptz,
  fulfilled_at timestamptz
)
language sql
stable
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
    fo.steam_reference_value,
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
    fo.fulfilled_at
  from public.fulfillment_orders as fo
  join public.profiles as p
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

revoke all
on function public.get_admin_fulfillment_orders()
from public, anon;

grant execute
on function public.get_admin_fulfillment_orders()
to authenticated;

-- 3. Recreate financial metrics as VOLATILE so each RPC call reads the latest
-- committed order values. Revenue remains the actual membership price; Steam
-- reference value is inventory value, not business revenue.
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
      coalesce(mt.monthly_price_cents, 0)::bigint as order_revenue_cents,
      round(coalesce(fo.acquisition_cost, 0) * 100)::bigint as order_cost_cents
    from public.fulfillment_orders as fo
    left join public.membership_tiers as mt
      on lower(mt.name) = lower(fo.tier_name)
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
    coalesce(
      sum(valid.order_revenue_cents - valid.order_cost_cents),
      0
    )::bigint,
    count(valid.id)::bigint
  from periods as period
  left join valid_orders as valid
    on valid.effective_cycle >= period.start_date
  group by period.period_key
  order by case period.period_key
    when 'current_month' then 1
    when 'fiscal_year' then 2
    else 3
  end;
$$;

revoke all
on function public.get_admin_business_metrics()
from public, anon;

grant execute
on function public.get_admin_business_metrics()
to authenticated;

notify pgrst, 'reload schema';

select
  to_regprocedure('public.set_my_featured_trophy_slots(uuid,uuid,uuid)') as trophy_slots,
  to_regprocedure('public.get_admin_fulfillment_orders()') as fulfillment_queue,
  to_regprocedure('public.get_admin_business_metrics()') as business_metrics;
