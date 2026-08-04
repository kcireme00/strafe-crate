-- ============================================================
-- STRAFE CRATE COMPLETE TROPHY + PROFILE + LIVE TIER TRACKER
-- Run as a NEW query in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. PROFILE FULFILLMENT READINESS
-- ============================================================

alter table public.profiles
add column if not exists fulfillment_ready boolean not null default false;

update public.profiles
set steam_profile_url = null
where trim(coalesce(steam_profile_url, '')) = '';

update public.profiles
set steam_trade_url = null
where trim(coalesce(steam_trade_url, '')) = '';

create or replace function public.is_valid_steam_profile_url(value text)
returns boolean
language sql
immutable
as $$
  select value is not null
    and trim(value) ~* '^https://steamcommunity\.com/(id|profiles)/[^/?#]+/?$';
$$;

create or replace function public.is_valid_steam_trade_url(value text)
returns boolean
language sql
immutable
as $$
  select value is not null
    and trim(value) ~* '^https://steamcommunity\.com/tradeoffer/new/\?partner=[0-9]+&token=[A-Za-z0-9_-]+$';
$$;

create or replace function public.refresh_profile_fulfillment_ready()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.steam_profile_url := nullif(trim(new.steam_profile_url), '');
  new.steam_trade_url := nullif(trim(new.steam_trade_url), '');

  new.fulfillment_ready :=
    public.is_valid_steam_profile_url(new.steam_profile_url)
    and public.is_valid_steam_trade_url(new.steam_trade_url);

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
  public.is_valid_steam_profile_url(steam_profile_url)
  and public.is_valid_steam_trade_url(steam_trade_url);

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

  if clean_profile_url is not null
     and not public.is_valid_steam_profile_url(clean_profile_url) then
    raise exception 'Enter a valid Steam profile URL.';
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
on function public.update_my_fulfillment_profile(text, text, text, text)
from public, anon;

grant execute
on function public.update_my_fulfillment_profile(text, text, text, text)
to authenticated;

-- ============================================================
-- 2. TROPHY TABLES + CATALOG
-- ============================================================

create table if not exists public.trophy_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  icon text not null default '',
  rarity text not null default 'common'
    check (rarity in ('common', 'rare', 'epic', 'legendary')),
  active boolean not null default true
);

create table if not exists public.member_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trophy_id uuid not null references public.trophy_definitions(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  featured_slot smallint check (featured_slot between 1 and 3),
  award_reason text,
  awarded_by uuid references public.profiles(id),
  unique (user_id, trophy_id),
  unique (user_id, featured_slot)
);

alter table public.member_trophies add column if not exists featured_slot smallint;
alter table public.member_trophies add column if not exists award_reason text;
alter table public.member_trophies add column if not exists awarded_by uuid references public.profiles(id);

insert into public.trophy_definitions (slug, name, description, icon, rarity, active)
values
  ('founding-member','Founding Member','Joined Strafe Crate during its founding launch period.','','legendary',true),
  ('first-drop','First Drop','Completed the first successful monthly fulfillment cycle.','','common',true),
  ('three-month-streak','Momentum','Completed three consecutive paid membership cycles.','','common',true),
  ('six-month-collector','Dedicated Collector','Completed six consecutive paid membership cycles.','','rare',true),
  ('one-year-collector','Annual Collector','Completed twelve consecutive paid membership cycles.','','epic',true),
  ('weapon-master','Weapon Master','Completed an entire eligible weapon-category rotation.','','legendary',true),
  ('first-upgrade','Trade Up','Successfully completed the first eligible upgrade cycle.','','rare',true),
  ('five-upgrades','Upgrade Specialist','Successfully completed five eligible upgrade cycles.','','epic',true),
  ('first-reward','Supply Runner','Redeemed the first Supply Credit reward.','','common',true),
  ('level-10','Level 10 Collector','Reached Collector Level 10.','','common',true),
  ('level-25','Level 25 Veteran','Reached Collector Level 25.','','rare',true),
  ('level-50','Level 50 Elite','Reached Collector Level 50.','','epic',true),
  ('community-regular','Community Regular','Recognized for consistent positive community participation.','','rare',true),
  ('event-winner','Event Champion','Won an official Strafe Crate community event.','','epic',true),
  ('trivia-champion','Trivia Champion','Won an official community trivia event.','','rare',true),
  ('rps-champion','RPS Champion','Won an official Rock Paper Scissors event.','','rare',true),
  ('perfect-cycle','Perfect Cycle','Completed a monthly cycle with payment, trade, and acceptance without delay.','','rare',true),
  ('prestige-year','Prestige Loyalist','Maintained a Prestige membership for twelve paid cycles.','','legendary',true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  rarity = excluded.rarity,
  active = excluded.active;

alter table public.trophy_definitions enable row level security;
alter table public.member_trophies enable row level security;

drop policy if exists "Authenticated view trophy definitions" on public.trophy_definitions;
create policy "Authenticated view trophy definitions"
on public.trophy_definitions
for select
to authenticated
using (active = true);

drop policy if exists "Members view own trophies" on public.member_trophies;
create policy "Members view own trophies"
on public.member_trophies
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage member trophies" on public.member_trophies;
create policy "Admins manage member trophies"
on public.member_trophies
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.trophy_definitions, public.member_trophies to authenticated;
grant insert, update, delete on public.member_trophies to authenticated;

create or replace function public.get_my_trophy_cabinet()
returns table (
  member_trophy_id uuid,
  trophy_id uuid,
  slug text,
  name text,
  description text,
  icon text,
  rarity text,
  awarded_at timestamptz,
  featured_slot smallint
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    mt.id,
    td.id,
    td.slug,
    td.name,
    td.description,
    td.icon,
    td.rarity,
    mt.awarded_at,
    mt.featured_slot
  from public.member_trophies mt
  join public.trophy_definitions td on td.id = mt.trophy_id
  where mt.user_id = auth.uid()
    and td.active = true
  order by
    mt.featured_slot nulls last,
    case td.rarity
      when 'legendary' then 1
      when 'epic' then 2
      when 'rare' then 3
      else 4
    end,
    mt.awarded_at;
$$;

revoke all on function public.get_my_trophy_cabinet() from public, anon;
grant execute on function public.get_my_trophy_cabinet() to authenticated;

create or replace function public.set_my_featured_trophies(
  selected_trophy_ids uuid[]
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
  selected_count integer;
  owned_count integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  selected_trophy_ids := coalesce(selected_trophy_ids, array[]::uuid[]);
  selected_count := cardinality(selected_trophy_ids);

  if selected_count > 3 then
    raise exception 'You may feature no more than three trophies.';
  end if;

  if (
    select count(distinct item)
    from unnest(selected_trophy_ids) item
  ) <> selected_count then
    raise exception 'The same trophy cannot be selected more than once.';
  end if;

  select count(*)
  into owned_count
  from public.member_trophies mt
  where mt.user_id = current_user_id
    and mt.trophy_id = any(selected_trophy_ids);

  if owned_count <> selected_count then
    raise exception 'You may only feature trophies unlocked by your account.';
  end if;

  update public.member_trophies
  set featured_slot = null
  where user_id = current_user_id
    and featured_slot is not null;

  update public.member_trophies mt
  set featured_slot = selected.position::smallint
  from (
    select trophy_id, position
    from unnest(selected_trophy_ids)
      with ordinality as chosen(trophy_id, position)
  ) selected
  where mt.user_id = current_user_id
    and mt.trophy_id = selected.trophy_id;

  return query
  select mt.trophy_id, mt.featured_slot
  from public.member_trophies mt
  where mt.user_id = current_user_id
    and mt.featured_slot is not null
  order by mt.featured_slot;
end;
$$;

revoke all on function public.set_my_featured_trophies(uuid[]) from public, anon;
grant execute on function public.set_my_featured_trophies(uuid[]) to authenticated;

-- ============================================================
-- 3. BLOCK FULFILLMENT UNTIL STEAM DETAILS EXIST
-- ============================================================

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
        'This member must save a valid Steam profile URL and Steam trade URL before fulfillment can continue.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists require_fulfillment_ready_profile_trigger
on public.fulfillment_orders;

create trigger require_fulfillment_ready_profile_trigger
before insert or update of status, user_id
on public.fulfillment_orders
for each row
execute function public.require_fulfillment_ready_profile();

-- ============================================================
-- 4. LIVE PUBLIC TIER COUNTS
-- ============================================================

create or replace function public.get_public_tier_counts()
returns table (
  tier_name text,
  active_members bigint
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with expected_tiers(tier_name, sort_order) as (
    values
      ('Recruit', 1),
      ('Operative', 2),
      ('Vanguard', 3),
      ('Elite', 4),
      ('Master', 5),
      ('Prestige', 6)
  ),
  counted as (
    select
      lower(mt.name) as normalized_tier,
      count(distinct s.user_id)::bigint as member_count
    from public.subscriptions s
    join public.membership_tiers mt on mt.id = s.tier_id
    where lower(coalesce(s.status::text, '')) in ('active', 'trialing')
    group by lower(mt.name)
  )
  select
    et.tier_name,
    coalesce(c.member_count, 0)::bigint
  from expected_tiers et
  left join counted c on c.normalized_tier = lower(et.tier_name)
  order by et.sort_order;
$$;

revoke all on function public.get_public_tier_counts() from public;
grant execute on function public.get_public_tier_counts() to anon, authenticated;

notify pgrst, 'reload schema';

select proname
from pg_proc
where proname in (
  'update_my_fulfillment_profile',
  'get_my_trophy_cabinet',
  'set_my_featured_trophies',
  'get_public_tier_counts'
)
order by proname;
