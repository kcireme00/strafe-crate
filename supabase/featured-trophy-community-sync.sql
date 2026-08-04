-- ============================================================
-- STRAFE CRATE FEATURED TROPHY + COMMUNITY IDENTITY SYNC
-- Run as a NEW query in Supabase SQL Editor.
-- ============================================================

create or replace function public.get_my_featured_trophies()
returns table (
  trophy_id uuid,
  slug text,
  name text,
  rarity text,
  featured_slot smallint
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    mt.trophy_id,
    td.slug,
    td.name,
    td.rarity,
    mt.featured_slot
  from public.member_trophies mt
  join public.trophy_definitions td
    on td.id = mt.trophy_id
  where mt.user_id = auth.uid()
    and mt.featured_slot between 1 and 3
    and td.active = true
  order by mt.featured_slot;
$$;

revoke all
on function public.get_my_featured_trophies()
from public, anon;

grant execute
on function public.get_my_featured_trophies()
to authenticated;

create or replace function public.get_public_community_identity(
  target_user_id uuid
)
returns table (
  user_id uuid,
  display_name text,
  role text,
  tier_name text,
  tier_color text,
  collector_level integer,
  featured_trophy_slug text,
  featured_trophy_name text,
  featured_trophy_rarity text
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with loyalty as (
    select
      la.user_id,
      greatest(
        1,
        floor(
          sqrt(greatest(coalesce(la.lifetime_xp, 0), 0)::numeric / 100)
        )::integer + 1
      ) as collector_level
    from public.loyalty_accounts la
    where la.user_id = target_user_id
  ),
  current_subscription as (
    select
      s.user_id,
      mt.name as tier_name,
      case lower(mt.name)
        when 'recruit' then '#96a1af'
        when 'operative' then '#438cff'
        when 'vanguard' then '#42c97a'
        when 'elite' then '#9b4ff0'
        when 'master' then '#e4ad35'
        when 'prestige' then '#eb405b'
        else '#ff7628'
      end as tier_color
    from public.subscriptions s
    join public.membership_tiers mt
      on mt.id = s.tier_id
    where s.user_id = target_user_id
      and lower(coalesce(s.status::text, '')) in (
        'active',
        'trialing'
      )
    order by s.created_at desc
    limit 1
  ),
  featured as (
    select
      mt.user_id,
      td.slug,
      td.name,
      td.rarity
    from public.member_trophies mt
    join public.trophy_definitions td
      on td.id = mt.trophy_id
    where mt.user_id = target_user_id
      and mt.featured_slot = 1
      and td.active = true
    limit 1
  )
  select
    p.id,
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      'Member'
    ),
    p.role,
    cs.tier_name,
    cs.tier_color,
    coalesce(l.collector_level, 1),
    f.slug,
    f.name,
    f.rarity
  from public.profiles p
  left join loyalty l
    on l.user_id = p.id
  left join current_subscription cs
    on cs.user_id = p.id
  left join featured f
    on f.user_id = p.id
  where p.id = target_user_id;
$$;

revoke all
on function public.get_public_community_identity(uuid)
from public, anon;

grant execute
on function public.get_public_community_identity(uuid)
to authenticated;

notify pgrst, 'reload schema';

select proname
from pg_proc
where proname in (
  'get_my_featured_trophies',
  'get_public_community_identity'
)
order by proname;
