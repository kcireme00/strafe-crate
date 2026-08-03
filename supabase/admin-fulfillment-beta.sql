-- ============================================================
-- STRAFE CRATE ADMIN FULFILLMENT BETA
-- Run in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- Admin check
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- BETA FULFILLMENT ORDERS
-- ------------------------------------------------------------

create table if not exists public.fulfillment_orders (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references public.profiles(id)
    on delete cascade,

  cycle_month date not null
    default date_trunc('month', now())::date,

  tier_name text,
  weapon_category text,
  skin_name text,
  exterior text,

  steam_reference_value numeric(10,2)
    check (
      steam_reference_value is null
      or steam_reference_value >= 0
    ),

  acquisition_cost numeric(10,2)
    check (
      acquisition_cost is null
      or acquisition_cost >= 0
    ),

  trade_offer_url text,
  trade_offer_id text,

  status text not null default 'draft'
    check (
      status in (
        'draft',
        'purchasing',
        'ready_to_send',
        'trade_sent',
        'accepted',
        'fulfilled',
        'failed',
        'cancelled'
      )
    ),

  admin_notes text,

  created_by uuid
    references public.profiles(id),

  fulfilled_by uuid
    references public.profiles(id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  trade_sent_at timestamptz,
  fulfilled_at timestamptz
);

create index if not exists fulfillment_orders_user_idx
on public.fulfillment_orders(user_id);

create index if not exists fulfillment_orders_status_idx
on public.fulfillment_orders(status);

create index if not exists fulfillment_orders_cycle_idx
on public.fulfillment_orders(cycle_month);

-- Automatically update timestamps.
create or replace function public.touch_fulfillment_order()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if new.status = 'trade_sent'
     and old.status is distinct from new.status
     and new.trade_sent_at is null then
    new.trade_sent_at := now();
  end if;

  if new.status = 'fulfilled'
     and old.status is distinct from new.status then
    new.fulfilled_at := coalesce(new.fulfilled_at, now());
    new.fulfilled_by := coalesce(new.fulfilled_by, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists touch_fulfillment_order_trigger
on public.fulfillment_orders;

create trigger touch_fulfillment_order_trigger
before update on public.fulfillment_orders
for each row
execute function public.touch_fulfillment_order();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------

alter table public.fulfillment_orders enable row level security;

drop policy if exists "Admins manage fulfillment orders"
on public.fulfillment_orders;

create policy "Admins manage fulfillment orders"
on public.fulfillment_orders
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members view own fulfillment orders"
on public.fulfillment_orders;

create policy "Members view own fulfillment orders"
on public.fulfillment_orders
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

grant select, insert, update, delete
on public.fulfillment_orders
to authenticated;

-- ------------------------------------------------------------
-- ADMIN MEMBER DIRECTORY RPC
-- ------------------------------------------------------------

create or replace function public.get_admin_member_directory()
returns table (
  user_id uuid,
  display_name text,
  email text,
  role text,
  account_approved boolean
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      split_part(p.email, '@', 1),
      'Member'
    ),
    p.email,
    p.role,
    coalesce(p.account_approved, false)
  from public.profiles p
  where public.is_admin()
  order by
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      p.email
    );
$$;

revoke all on function public.get_admin_member_directory()
from public, anon;

grant execute on function public.get_admin_member_directory()
to authenticated;

-- ------------------------------------------------------------
-- ADMIN FULFILLMENT OVERVIEW RPC
-- ------------------------------------------------------------

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
    fo.trade_offer_url,
    fo.trade_offer_id,
    fo.status,
    fo.admin_notes,
    fo.created_at,
    fo.updated_at,
    fo.trade_sent_at,
    fo.fulfilled_at
  from public.fulfillment_orders fo
  join public.profiles p on p.id = fo.user_id
  where public.is_admin()
  order by
    case fo.status
      when 'draft' then 0
      when 'purchasing' then 1
      when 'ready_to_send' then 2
      when 'trade_sent' then 3
      when 'accepted' then 4
      when 'fulfilled' then 5
      else 6
    end,
    fo.created_at desc;
$$;

revoke all on function public.get_admin_fulfillment_orders()
from public, anon;

grant execute on function public.get_admin_fulfillment_orders()
to authenticated;

notify pgrst, 'reload schema';

select
  to_regclass('public.fulfillment_orders') as fulfillment_orders_table;
