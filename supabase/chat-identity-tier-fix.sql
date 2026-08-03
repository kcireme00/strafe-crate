-- ============================================================
-- CHAT IDENTITY + TIER SNAPSHOT FIX
-- Run this once in the SAME Supabase project used by the website.
-- It fills real usernames, levels, and subscription tiers.
-- ============================================================

create or replace function public.chat_level_from_xp(xp bigint)
returns integer
language sql
immutable
as $$
  select greatest(
    1,
    floor(sqrt(greatest(coalesce(xp, 0), 0)::numeric / 100))::integer + 1
  );
$$;

create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  resolved_name text;
  resolved_tier text;
  resolved_level integer;
  latest_message timestamptz;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'You may only post chat messages from your own account.';
  end if;

  select max(created_at)
  into latest_message
  from public.chat_messages
  where user_id = new.user_id;

  if latest_message is not null
     and latest_message > now() - interval '3 seconds' then
    raise exception 'Please wait a few seconds before posting again.';
  end if;

  select
    coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(p.full_name), ''),
      split_part(coalesce(p.email, 'Member'), '@', 1),
      'Member'
    ),
    mt.name,
    public.chat_level_from_xp(coalesce(la.lifetime_xp, 0))
  into resolved_name, resolved_tier, resolved_level
  from public.profiles p
  left join lateral (
    select s.tier_id
    from public.subscriptions s
    where s.user_id = p.id
    order by
      case
        when coalesce(s.status, '') in ('active','trialing') then 0
        else 1
      end,
      s.created_at desc
    limit 1
  ) active_subscription on true
  left join public.membership_tiers mt
    on mt.id = active_subscription.tier_id
  left join public.loyalty_accounts la
    on la.user_id = p.id
  where p.id = new.user_id;

  new.body := trim(new.body);
  new.display_name_snapshot := coalesce(resolved_name, 'Member');
  new.tier_name_snapshot := resolved_tier;
  new.level_snapshot := coalesce(resolved_level, 1);

  return new;
end;
$$;

drop trigger if exists prepare_chat_message_trigger
on public.chat_messages;

create trigger prepare_chat_message_trigger
before insert on public.chat_messages
for each row
execute function public.prepare_chat_message();

-- Repair existing messages that were saved with "Pending".
update public.chat_messages cm
set
  display_name_snapshot = coalesce(
    nullif(trim(p.display_name), ''),
    nullif(trim(p.full_name), ''),
    split_part(coalesce(p.email, 'Member'), '@', 1),
    'Member'
  ),
  tier_name_snapshot = resolved.tier_name,
  level_snapshot = public.chat_level_from_xp(coalesce(la.lifetime_xp, 0))
from public.profiles p
left join lateral (
  select mt.name as tier_name
  from public.subscriptions s
  left join public.membership_tiers mt on mt.id = s.tier_id
  where s.user_id = p.id
  order by
    case
      when coalesce(s.status, '') in ('active','trialing') then 0
      else 1
    end,
    s.created_at desc
  limit 1
) resolved on true
left join public.loyalty_accounts la on la.user_id = p.id
where cm.user_id = p.id
  and (
    cm.display_name_snapshot in ('Pending','Member')
    or cm.display_name_snapshot is null
  );

notify pgrst, 'reload schema';

select
  display_name_snapshot,
  coalesce(tier_name_snapshot, 'Membership pending') as tier,
  level_snapshot
from public.chat_messages
order by created_at desc
limit 5;
