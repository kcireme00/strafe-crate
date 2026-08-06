-- ============================================================
-- STRAFE CRATE: MULTI-SKIN FULFILLMENT + ELITE+ UPGRADE PROGRAM
-- Run as a NEW query after prior launch migrations.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. MULTI-SKIN ORDER ITEMS
-- ------------------------------------------------------------

create table if not exists public.fulfillment_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.fulfillment_orders(id) on delete cascade,
  weapon_category text,
  skin_name text,
  exterior text,
  acquisition_cost numeric(10,2),
  sort_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fulfillment_order_items_order_idx
on public.fulfillment_order_items(order_id, sort_order);

alter table public.fulfillment_order_items enable row level security;

drop policy if exists "Admins manage fulfillment order items"
on public.fulfillment_order_items;

create policy "Admins manage fulfillment order items"
on public.fulfillment_order_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members view own fulfillment items"
on public.fulfillment_order_items;

create policy "Members view own fulfillment items"
on public.fulfillment_order_items
for select
to authenticated
using (
  exists (
    select 1
    from public.fulfillment_orders fo
    where fo.id = fulfillment_order_items.order_id
      and fo.user_id = auth.uid()
  )
);

grant select, insert, update, delete
on public.fulfillment_order_items
to authenticated;

-- Backfill one item for every existing order.
insert into public.fulfillment_order_items (
  order_id,
  weapon_category,
  skin_name,
  exterior,
  acquisition_cost,
  sort_order
)
select
  fo.id,
  fo.weapon_category,
  fo.skin_name,
  fo.exterior,
  fo.acquisition_cost,
  1
from public.fulfillment_orders fo
where not exists (
  select 1
  from public.fulfillment_order_items item
  where item.order_id = fo.id
);

-- Ensure newly created Reward orders immediately have a recognizable item.
create or replace function public.seed_fulfillment_order_item()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.fulfillment_order_items item where item.order_id = new.id
  ) then
    insert into public.fulfillment_order_items(
      order_id,
      weapon_category,
      skin_name,
      exterior,
      acquisition_cost,
      sort_order
    ) values (
      new.id,
      new.weapon_category,
      coalesce(new.skin_name, case when new.order_type = 'reward' then 'Reward' else null end),
      coalesce(new.exterior, case when new.order_type = 'reward' then 'Reward' else null end),
      new.acquisition_cost,
      1
    );
  end if;
  return new;
end;
$$;

drop trigger if exists seed_fulfillment_order_item_trigger
on public.fulfillment_orders;

create trigger seed_fulfillment_order_item_trigger
after insert on public.fulfillment_orders
for each row execute function public.seed_fulfillment_order_item();

-- ------------------------------------------------------------
-- 2. ELITE+ UPGRADE REQUESTS
-- ------------------------------------------------------------

create table if not exists public.upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  target_cycle date not null,
  source_item_id uuid not null references public.fulfillment_order_items(id),
  source_order_id uuid not null references public.fulfillment_orders(id),
  source_weapon_category text,
  source_skin_name text not null,
  source_exterior text,
  source_floor_value numeric(10,2),
  status text not null default 'intent_recorded'
    check (status in ('intent_recorded','trade_received','applied','cancelled','declined','completed')),
  acknowledged_timing boolean not null default false,
  acknowledged_risk boolean not null default false,
  acknowledged_stickers boolean not null default false,
  acknowledged_trade_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, target_cycle)
);

alter table public.upgrade_requests enable row level security;

drop policy if exists "Members view own upgrade requests"
on public.upgrade_requests;
create policy "Members view own upgrade requests"
on public.upgrade_requests
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage upgrade requests"
on public.upgrade_requests;
create policy "Admins manage upgrade requests"
on public.upgrade_requests
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select, insert, update on public.upgrade_requests to authenticated;

alter table public.fulfillment_orders
add column if not exists is_upgrade boolean not null default false;

alter table public.fulfillment_orders
add column if not exists upgrade_request_id uuid references public.upgrade_requests(id);

create or replace function public.get_my_upgrade_eligibility()
returns table (
  eligible boolean,
  tier_name text,
  target_cycle date,
  existing_request_id uuid,
  existing_status text
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with active_tier as (
    select mt.name
    from public.subscriptions s
    join public.membership_tiers mt on mt.id = s.tier_id
    where s.user_id = auth.uid()
      and lower(coalesce(s.status::text,'')) in ('active','trialing')
    order by s.created_at desc
    limit 1
  ), target as (
    select (date_trunc('month', current_date) + interval '1 month')::date as target_cycle
  )
  select
    coalesce(lower(active_tier.name) in ('elite','master','prestige'), false),
    active_tier.name,
    target.target_cycle,
    request.id,
    request.status
  from target
  left join active_tier on true
  left join public.upgrade_requests request
    on request.user_id = auth.uid()
   and request.target_cycle = target.target_cycle;
$$;

revoke all on function public.get_my_upgrade_eligibility() from public, anon;
grant execute on function public.get_my_upgrade_eligibility() to authenticated;

create or replace function public.get_my_upgrade_items()
returns table (
  item_id uuid,
  order_id uuid,
  weapon_category text,
  skin_name text,
  exterior text,
  fulfilled_at timestamptz,
  floor_value numeric
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    item.id,
    fo.id,
    item.weapon_category,
    coalesce(item.skin_name, 'Delivered skin'),
    item.exterior,
    coalesce(fo.fulfilled_at, fo.updated_at),
    null::numeric
  from public.fulfillment_order_items item
  join public.fulfillment_orders fo on fo.id = item.order_id
  where fo.user_id = auth.uid()
    and fo.status::text in ('accepted','fulfilled','completed')
    and coalesce(item.skin_name,'') <> ''
    and not exists (
      select 1
      from public.upgrade_requests request
      where request.source_item_id = item.id
        and request.status not in ('cancelled','declined')
    )
  order by coalesce(fo.fulfilled_at, fo.updated_at) desc;
$$;

revoke all on function public.get_my_upgrade_items() from public, anon;
grant execute on function public.get_my_upgrade_items() to authenticated;

create or replace function public.submit_my_upgrade_request(
  source_item_id uuid,
  acknowledged_timing boolean,
  acknowledged_risk boolean,
  acknowledged_stickers boolean,
  acknowledged_trade_required boolean
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  member_tier text;
  target_month date := (date_trunc('month', current_date) + interval '1 month')::date;
  source_record record;
  request_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select mt.name into member_tier
  from public.subscriptions s
  join public.membership_tiers mt on mt.id = s.tier_id
  where s.user_id = current_user_id
    and lower(coalesce(s.status::text,'')) in ('active','trialing')
  order by s.created_at desc
  limit 1;

  if lower(coalesce(member_tier,'')) not in ('elite','master','prestige') then
    raise exception 'Upgrade access requires an active Elite, Master, or Prestige membership.';
  end if;

  if not (
    acknowledged_timing
    and acknowledged_risk
    and acknowledged_stickers
    and acknowledged_trade_required
  ) then
    raise exception 'Every upgrade acknowledgement must be accepted.';
  end if;

  select
    item.id as item_id,
    item.order_id,
    item.weapon_category,
    item.skin_name,
    item.exterior
  into source_record
  from public.fulfillment_order_items item
  join public.fulfillment_orders fo on fo.id = item.order_id
  where item.id = source_item_id
    and fo.user_id = current_user_id
    and fo.status::text in ('accepted','fulfilled','completed');

  if source_record.item_id is null then
    raise exception 'Select a previously fulfilled Strafe Crate skin.';
  end if;

  insert into public.upgrade_requests(
    user_id,
    target_cycle,
    source_item_id,
    source_order_id,
    source_weapon_category,
    source_skin_name,
    source_exterior,
    acknowledged_timing,
    acknowledged_risk,
    acknowledged_stickers,
    acknowledged_trade_required,
    status,
    updated_at
  ) values (
    current_user_id,
    target_month,
    source_record.item_id,
    source_record.order_id,
    source_record.weapon_category,
    source_record.skin_name,
    source_record.exterior,
    acknowledged_timing,
    acknowledged_risk,
    acknowledged_stickers,
    acknowledged_trade_required,
    'intent_recorded',
    now()
  )
  on conflict(user_id, target_cycle) do update set
    source_item_id = excluded.source_item_id,
    source_order_id = excluded.source_order_id,
    source_weapon_category = excluded.source_weapon_category,
    source_skin_name = excluded.source_skin_name,
    source_exterior = excluded.source_exterior,
    acknowledged_timing = excluded.acknowledged_timing,
    acknowledged_risk = excluded.acknowledged_risk,
    acknowledged_stickers = excluded.acknowledged_stickers,
    acknowledged_trade_required = excluded.acknowledged_trade_required,
    status = 'intent_recorded',
    updated_at = now()
  returning id into request_id;

  return request_id;
end;
$$;

revoke all on function public.submit_my_upgrade_request(uuid,boolean,boolean,boolean,boolean)
from public, anon;
grant execute on function public.submit_my_upgrade_request(uuid,boolean,boolean,boolean,boolean)
to authenticated;

-- ------------------------------------------------------------
-- 3. ADMIN QUEUE + ATOMIC SAVE
-- ------------------------------------------------------------

create or replace function public.get_admin_fulfillment_orders_v3()
returns table (
  order_id uuid,
  user_id uuid,
  display_name text,
  email text,
  cycle_month date,
  tier_name text,
  membership_value numeric,
  order_type text,
  trade_offer_url text,
  trade_offer_id text,
  status text,
  admin_notes text,
  items jsonb,
  upgrade_request_id uuid,
  upgrade_request_status text,
  upgrade_source_skin text,
  upgrade_source_weapon text,
  upgrade_source_exterior text,
  upgrade_target_cycle date,
  is_upgrade boolean
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
    coalesce(nullif(trim(p.display_name),''),nullif(trim(p.full_name),''),split_part(p.email,'@',1),'Member'),
    p.email,
    fo.cycle_month,
    fo.tier_name,
    fo.membership_value,
    fo.order_type,
    coalesce(nullif(trim(fo.trade_offer_url),''),nullif(trim(p.steam_trade_url),'')),
    fo.trade_offer_id,
    fo.status::text,
    fo.admin_notes,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', item.id,
          'weapon_category', item.weapon_category,
          'skin_name', item.skin_name,
          'exterior', item.exterior,
          'acquisition_cost', item.acquisition_cost,
          'sort_order', item.sort_order
        ) order by item.sort_order
      ) filter(where item.id is not null),
      '[]'::jsonb
    ),
    request.id,
    request.status,
    request.source_skin_name,
    request.source_weapon_category,
    request.source_exterior,
    request.target_cycle,
    fo.is_upgrade
  from public.fulfillment_orders fo
  join public.profiles p on p.id = fo.user_id
  left join public.fulfillment_order_items item on item.order_id = fo.id
  left join lateral (
    select request.*
    from public.upgrade_requests request
    where request.user_id = fo.user_id
      and request.target_cycle = fo.cycle_month
      and request.status not in ('cancelled','declined')
    order by request.updated_at desc
    limit 1
  ) request on true
  where public.is_admin()
  group by fo.id,p.id,request.id
  order by
    case fo.status::text
      when 'draft' then 0 when 'purchasing' then 1 when 'ready_to_send' then 2
      when 'trade_sent' then 3 when 'accepted' then 4 when 'fulfilled' then 5 else 6
    end,
    fo.created_at desc;
$$;

revoke all on function public.get_admin_fulfillment_orders_v3() from public, anon;
grant execute on function public.get_admin_fulfillment_orders_v3() to authenticated;

create or replace function public.save_admin_fulfillment_order_v3(
  target_order_id uuid,
  new_tier_name text,
  new_membership_value numeric,
  new_trade_offer_id text,
  new_trade_offer_url text,
  new_status text,
  new_admin_notes text,
  apply_upgrade boolean,
  selected_upgrade_request_id uuid,
  order_items jsonb
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  first_item record;
  total_cost numeric(10,2);
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  delete from public.fulfillment_order_items where order_id = target_order_id;

  insert into public.fulfillment_order_items(
    id,order_id,weapon_category,skin_name,exterior,acquisition_cost,sort_order,updated_at
  )
  select
    coalesce(nullif(value->>'id','')::uuid,gen_random_uuid()),
    target_order_id,
    nullif(value->>'weapon_category',''),
    nullif(value->>'skin_name',''),
    nullif(value->>'exterior',''),
    nullif(value->>'acquisition_cost','')::numeric,
    coalesce(nullif(value->>'sort_order','')::integer,ordinality::integer),
    now()
  from jsonb_array_elements(coalesce(order_items,'[]'::jsonb)) with ordinality as item(value,ordinality);

  select * into first_item
  from public.fulfillment_order_items
  where order_id = target_order_id
  order by sort_order
  limit 1;

  select coalesce(sum(acquisition_cost),0)
  into total_cost
  from public.fulfillment_order_items
  where order_id = target_order_id;

  update public.fulfillment_orders fo
  set
    tier_name = new_tier_name,
    membership_value = coalesce(new_membership_value,0),
    trade_offer_id = nullif(trim(new_trade_offer_id),''),
    trade_offer_url = nullif(trim(new_trade_offer_url),''),
    status = new_status,
    admin_notes = nullif(trim(new_admin_notes),''),
    weapon_category = first_item.weapon_category,
    skin_name = first_item.skin_name,
    exterior = first_item.exterior,
    acquisition_cost = total_cost,
    is_upgrade = coalesce(apply_upgrade,false),
    upgrade_request_id = case when apply_upgrade then selected_upgrade_request_id else null end,
    updated_at = now()
  where fo.id = target_order_id;

  if apply_upgrade and selected_upgrade_request_id is not null then
    update public.upgrade_requests
    set status = 'applied', updated_at = now()
    where id = selected_upgrade_request_id;
  end if;
end;
$$;

revoke all on function public.save_admin_fulfillment_order_v3(uuid,text,numeric,text,text,text,text,boolean,uuid,jsonb)
from public, anon;
grant execute on function public.save_admin_fulfillment_order_v3(uuid,text,numeric,text,text,text,text,boolean,uuid,jsonb)
to authenticated;

-- ------------------------------------------------------------
-- 4. METRICS USE ONE REVENUE VALUE PER ORDER AND ALL ITEM COSTS
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
  with order_costs as (
    select order_id, coalesce(sum(acquisition_cost),0) as total_cost
    from public.fulfillment_order_items
    group by order_id
  ), valid_orders as (
    select
      fo.id,
      coalesce(fo.cycle_month,date_trunc('month',fo.created_at)::date) as effective_cycle,
      round(coalesce(fo.membership_value,0)*100)::bigint as revenue,
      round(coalesce(cost.total_cost,fo.acquisition_cost,0)*100)::bigint as cost
    from public.fulfillment_orders fo
    left join order_costs cost on cost.order_id = fo.id
    where coalesce(fo.is_test,false)=false
      and fo.status::text not in ('payment_failed','failed','cancelled','declined','expired','issue')
  ), periods(period_key,start_date) as (
    values
      ('current_month'::text,date_trunc('month',current_date)::date),
      ('fiscal_year'::text,date_trunc('year',current_date)::date),
      ('lifetime'::text,date '1900-01-01')
  )
  select
    period.period_key,
    coalesce(sum(valid.revenue),0)::bigint,
    coalesce(sum(valid.cost),0)::bigint,
    coalesce(sum(valid.revenue-valid.cost),0)::bigint,
    count(valid.id)::bigint
  from periods period
  left join valid_orders valid on valid.effective_cycle >= period.start_date
  group by period.period_key
  order by case period.period_key when 'current_month' then 1 when 'fiscal_year' then 2 else 3 end;
$$;

revoke all on function public.get_admin_business_metrics() from public, anon;
grant execute on function public.get_admin_business_metrics() to authenticated;

notify pgrst, 'reload schema';

select
  to_regclass('public.fulfillment_order_items') as multi_skin_items,
  to_regclass('public.upgrade_requests') as upgrade_requests,
  to_regprocedure('public.get_admin_fulfillment_orders_v3()') as admin_queue,
  to_regprocedure('public.submit_my_upgrade_request(uuid,boolean,boolean,boolean,boolean)') as upgrade_submit;
