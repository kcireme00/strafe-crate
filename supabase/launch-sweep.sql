-- STRAFE CRATE LAUNCH SWEEP
-- Run after the existing schema migrations.

create or replace function public.get_my_featured_trophies()
returns table (
  trophy_id uuid,
  slug text,
  name text,
  rarity text,
  featured_slot smallint
)
language sql stable security definer
set search_path = public set row_security = off
as $$
  select mt.trophy_id, td.slug, td.name, td.rarity, mt.featured_slot
  from public.member_trophies mt
  join public.trophy_definitions td on td.id = mt.trophy_id
  where mt.user_id = auth.uid()
    and mt.featured_slot between 1 and 3
    and td.active = true
  order by mt.featured_slot;
$$;

revoke all on function public.get_my_featured_trophies() from public, anon;
grant execute on function public.get_my_featured_trophies() to authenticated;

create or replace function public.get_public_community_identity(target_user_id uuid)
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
language sql stable security definer
set search_path = public set row_security = off
as $$
  with loyalty as (
    select la.user_id,
      greatest(1, floor(sqrt(greatest(coalesce(la.lifetime_xp,0),0)::numeric / 100))::integer + 1) collector_level
    from public.loyalty_accounts la where la.user_id = target_user_id
  ), current_subscription as (
    select s.user_id, mt.name tier_name,
      case lower(mt.name)
        when 'recruit' then '#96a1af' when 'operative' then '#438cff'
        when 'vanguard' then '#42c97a' when 'elite' then '#9b4ff0'
        when 'master' then '#e4ad35' when 'prestige' then '#eb405b'
        else '#ff7628' end tier_color
    from public.subscriptions s
    join public.membership_tiers mt on mt.id=s.tier_id
    where s.user_id=target_user_id and lower(coalesce(s.status::text,'')) in ('active','trialing')
    order by s.created_at desc limit 1
  ), featured as (
    select mt.user_id, td.slug, td.name, td.rarity
    from public.member_trophies mt
    join public.trophy_definitions td on td.id=mt.trophy_id
    where mt.user_id=target_user_id and mt.featured_slot=1 and td.active=true
    limit 1
  )
  select p.id,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(p.full_name),''),'Member'),
    p.role, cs.tier_name, cs.tier_color, coalesce(l.collector_level,1),
    f.slug, f.name, f.rarity
  from public.profiles p
  left join loyalty l on l.user_id=p.id
  left join current_subscription cs on cs.user_id=p.id
  left join featured f on f.user_id=p.id
  where p.id=target_user_id;
$$;

revoke all on function public.get_public_community_identity(uuid) from public, anon;
grant execute on function public.get_public_community_identity(uuid) to authenticated;

-- Include trophy slugs so player-card emblems and community emblems render identically.
create or replace function public.get_public_player_card(target_user_id uuid)
returns table (
  user_id uuid,
  display_name text,
  tier_name text,
  lifetime_xp bigint,
  supply_credits integer,
  consecutive_paid_months integer,
  xp_multiplier numeric,
  level integer,
  member_since timestamptz,
  trophies jsonb
)
language sql stable security definer
set search_path = public set row_security = off
as $$
  select p.id,
    coalesce(nullif(p.display_name,''),nullif(p.full_name,''),'Member'),
    mt.name,
    coalesce(la.lifetime_xp,0), coalesce(la.supply_credits,0),
    coalesce(la.consecutive_paid_months,0), coalesce(la.xp_multiplier,1.00),
    public.level_from_xp(coalesce(la.lifetime_xp,0)), p.created_at,
    coalesce(jsonb_agg(jsonb_build_object(
      'name',td.name,'description',td.description,'icon',td.icon,
      'slug',td.slug,'rarity',td.rarity,'featured_slot',mtp.featured_slot
    ) order by mtp.featured_slot nulls last, mtp.awarded_at)
    filter(where td.id is not null),'[]'::jsonb)
  from public.profiles p
  left join public.loyalty_accounts la on la.user_id=p.id
  left join public.subscriptions s on s.user_id=p.id and lower(coalesce(s.status::text,'')) in ('active','trialing')
  left join public.membership_tiers mt on mt.id=s.tier_id
  left join public.member_trophies mtp on mtp.user_id=p.id
  left join public.trophy_definitions td on td.id=mtp.trophy_id
  where p.id=target_user_id
  group by p.id,p.display_name,p.full_name,p.created_at,mt.name,
    la.lifetime_xp,la.supply_credits,la.consecutive_paid_months,la.xp_multiplier;
$$;

grant execute on function public.get_public_player_card(uuid) to authenticated;

notify pgrst, 'reload schema';


create or replace function public.set_my_featured_trophies(selected_trophy_ids uuid[])
returns table (trophy_id uuid, featured_slot smallint)
language plpgsql security definer
set search_path=public set row_security=off
as $$
declare
  current_user_id uuid := auth.uid();
  selected_count integer;
  owned_count integer;
begin
  if current_user_id is null then raise exception 'Authentication required.'; end if;
  selected_trophy_ids := coalesce(selected_trophy_ids,array[]::uuid[]);
  selected_count := cardinality(selected_trophy_ids);
  if selected_count > 3 then raise exception 'You may feature no more than three trophies.'; end if;
  if (select count(distinct chosen_id) from unnest(selected_trophy_ids) as chosen(chosen_id)) <> selected_count then
    raise exception 'The same trophy cannot be selected more than once.';
  end if;
  select count(*) into owned_count from public.member_trophies owned
  where owned.user_id=current_user_id and owned.trophy_id=any(selected_trophy_ids);
  if owned_count <> selected_count then raise exception 'You may only feature trophies unlocked by your account.'; end if;
  update public.member_trophies existing set featured_slot=null
  where existing.user_id=current_user_id and existing.featured_slot is not null;
  update public.member_trophies member_trophy
  set featured_slot=chosen.position::smallint
  from (select selected_id, selection_order position from unnest(selected_trophy_ids)
    with ordinality as selection(selected_id,selection_order)) chosen
  where member_trophy.user_id=current_user_id and member_trophy.trophy_id=chosen.selected_id;
  return query select saved.trophy_id,saved.featured_slot from public.member_trophies saved
  where saved.user_id=current_user_id and saved.featured_slot is not null order by saved.featured_slot;
end;
$$;
revoke all on function public.set_my_featured_trophies(uuid[]) from public,anon;
grant execute on function public.set_my_featured_trophies(uuid[]) to authenticated;

create or replace function public.get_public_tier_counts()
returns table(tier_name text, active_members bigint)
language sql stable security definer
set search_path=public set row_security=off
as $$
  with expected(tier_name,sort_order) as (values
    ('Recruit',1),('Operative',2),('Vanguard',3),('Elite',4),('Master',5),('Prestige',6)),
  counted as (
    select lower(mt.name) normalized,count(distinct s.user_id)::bigint member_count
    from public.subscriptions s join public.membership_tiers mt on mt.id=s.tier_id
    where lower(coalesce(s.status::text,'')) in ('active','trialing') group by lower(mt.name)
  )
  select e.tier_name,coalesce(c.member_count,0)::bigint from expected e
  left join counted c on c.normalized=lower(e.tier_name) order by e.sort_order;
$$;
revoke all on function public.get_public_tier_counts() from public;
grant execute on function public.get_public_tier_counts() to anon,authenticated;
notify pgrst,'reload schema';
