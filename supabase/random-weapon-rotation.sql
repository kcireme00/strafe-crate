-- ============================================================
-- STRAFE CRATE RANDOM WEAPON ROTATION
-- Run as a NEW query in Supabase SQL Editor.
--
-- Behavior:
-- - Assigns a random active weapon category not already used in the
--   member's current rotation.
-- - Existing open orders also count as used, preventing duplicate
--   assignments before fulfillment.
-- - When every active category has been used, the member begins a
--   new rotation cycle automatically.
-- - Admin can reroll or manually override the selected category.
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.weapon_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  sort_order integer not null,
  active boolean not null default true
);

insert into public.weapon_catalog (slug, name, sort_order, active)
values
  ('m249', 'M249', 1, true),
  ('mag-7', 'MAG-7', 2, true),
  ('negev', 'Negev', 3, true),
  ('nova', 'Nova', 4, true),
  ('sawed-off', 'Sawed-Off', 5, true),
  ('xm1014', 'XM1014', 6, true),
  ('cz75-auto', 'CZ75-Auto', 7, true),
  ('desert-eagle', 'Desert Eagle', 8, true),
  ('dual-berettas', 'Dual Berettas', 9, true),
  ('five-seven', 'Five-SeveN', 10, true),
  ('glock-18', 'Glock-18', 11, true),
  ('p2000', 'P2000', 12, true),
  ('p250', 'P250', 13, true),
  ('r8-revolver', 'R8 Revolver', 14, true),
  ('tec-9', 'Tec-9', 15, true),
  ('usp-s', 'USP-S', 16, true),
  ('ak-47', 'AK-47', 17, true),
  ('aug', 'AUG', 18, true),
  ('famas', 'FAMAS', 19, true),
  ('galil-ar', 'Galil AR', 20, true),
  ('m4a1-s', 'M4A1-S', 21, true),
  ('m4a4', 'M4A4', 22, true),
  ('sg-553', 'SG 553', 23, true),
  ('mac-10', 'MAC-10', 24, true),
  ('mp5-sd', 'MP5-SD', 25, true),
  ('mp7', 'MP7', 26, true),
  ('mp9', 'MP9', 27, true),
  ('p90', 'P90', 28, true),
  ('pp-bizon', 'PP-Bizon', 29, true),
  ('ump-45', 'UMP-45', 30, true),
  ('awp', 'AWP', 31, true),
  ('g3sg1', 'G3SG1', 32, true),
  ('scar-20', 'SCAR-20', 33, true),
  ('ssg-08', 'SSG 08', 34, true)
on conflict (slug) do update set
  name = excluded.name,
  sort_order = excluded.sort_order,
  active = excluded.active;

alter table public.fulfillment_orders
add column if not exists rotation_cycle integer not null default 1;

alter table public.fulfillment_orders
add column if not exists randomized_weapon boolean not null default false;

create table if not exists public.member_rotation_state (
  user_id uuid primary key
    references public.profiles(id)
    on delete cascade,

  current_cycle integer not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.weapon_catalog enable row level security;
alter table public.member_rotation_state enable row level security;

drop policy if exists "Anyone views active weapon catalog"
on public.weapon_catalog;

create policy "Anyone views active weapon catalog"
on public.weapon_catalog
for select
to anon, authenticated
using (active = true);

drop policy if exists "Members view own rotation state"
on public.member_rotation_state;

create policy "Members view own rotation state"
on public.member_rotation_state
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Admins manage rotation state"
on public.member_rotation_state;

create policy "Admins manage rotation state"
on public.member_rotation_state
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.weapon_catalog to anon, authenticated;
grant select, insert, update on public.member_rotation_state to authenticated;

create or replace function public.assign_random_weapon_for_order(
  target_order_id uuid
)
returns table (
  order_id uuid,
  weapon_category text,
  rotation_cycle integer,
  rotation_reset boolean,
  remaining_categories integer
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  order_user_id uuid;
  current_rotation integer;
  selected_weapon text;
  did_reset boolean := false;
  remaining_after integer;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  select fo.user_id
  into order_user_id
  from public.fulfillment_orders fo
  where fo.id = target_order_id
  for update;

  if order_user_id is null then
    raise exception 'Fulfillment order not found.';
  end if;

  insert into public.member_rotation_state (
    user_id,
    current_cycle
  )
  values (
    order_user_id,
    1
  )
  on conflict (user_id) do nothing;

  select mrs.current_cycle
  into current_rotation
  from public.member_rotation_state mrs
  where mrs.user_id = order_user_id
  for update;

  select wc.name
  into selected_weapon
  from public.weapon_catalog wc
  where wc.active = true
    and not exists (
      select 1
      from public.fulfillment_orders used_order
      where used_order.user_id = order_user_id
        and used_order.rotation_cycle = current_rotation
        and used_order.id <> target_order_id
        and lower(coalesce(used_order.weapon_category, '')) =
            lower(wc.name)
        and used_order.status::text not in (
          'failed',
          'cancelled',
          'declined',
          'expired',
          'issue'
        )
    )
  order by random()
  limit 1;

  if selected_weapon is null then
    current_rotation := current_rotation + 1;
    did_reset := true;

    update public.member_rotation_state
    set
      current_cycle = current_rotation,
      updated_at = now()
    where user_id = order_user_id;

    select wc.name
    into selected_weapon
    from public.weapon_catalog wc
    where wc.active = true
    order by random()
    limit 1;
  end if;

  if selected_weapon is null then
    raise exception 'No active weapon categories are available.';
  end if;

  update public.fulfillment_orders fo
  set
    weapon_category = selected_weapon,
    rotation_cycle = current_rotation,
    randomized_weapon = true,
    updated_at = now()
  where fo.id = target_order_id;

  select count(*)::integer
  into remaining_after
  from public.weapon_catalog wc
  where wc.active = true
    and lower(wc.name) <> lower(selected_weapon)
    and not exists (
      select 1
      from public.fulfillment_orders used_order
      where used_order.user_id = order_user_id
        and used_order.rotation_cycle = current_rotation
        and used_order.status::text not in (
          'failed',
          'cancelled',
          'declined',
          'expired',
          'issue'
        )
        and lower(coalesce(used_order.weapon_category, '')) =
            lower(wc.name)
    );

  return query
  select
    target_order_id,
    selected_weapon,
    current_rotation,
    did_reset,
    remaining_after;
end;
$$;

revoke all
on function public.assign_random_weapon_for_order(uuid)
from public, anon;

grant execute
on function public.assign_random_weapon_for_order(uuid)
to authenticated;

-- Optional member-facing rotation progress function.
create or replace function public.get_my_weapon_rotation_progress()
returns table (
  rotation_cycle integer,
  total_categories integer,
  completed_categories integer,
  remaining_categories integer
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with state as (
    select coalesce(
      (
        select mrs.current_cycle
        from public.member_rotation_state mrs
        where mrs.user_id = auth.uid()
      ),
      1
    ) as current_cycle
  ),
  totals as (
    select count(*)::integer as total_categories
    from public.weapon_catalog
    where active = true
  ),
  completed as (
    select count(distinct lower(fo.weapon_category))::integer
      as completed_categories
    from public.fulfillment_orders fo
    cross join state s
    where fo.user_id = auth.uid()
      and fo.rotation_cycle = s.current_cycle
      and fo.weapon_category is not null
      and fo.status::text in (
        'accepted',
        'fulfilled',
        'completed'
      )
  )
  select
    s.current_cycle,
    t.total_categories,
    c.completed_categories,
    greatest(
      t.total_categories - c.completed_categories,
      0
    )
  from state s
  cross join totals t
  cross join completed c;
$$;

revoke all
on function public.get_my_weapon_rotation_progress()
from public, anon;

grant execute
on function public.get_my_weapon_rotation_progress()
to authenticated;

notify pgrst, 'reload schema';

select
  count(*) as active_weapon_categories
from public.weapon_catalog
where active = true;
