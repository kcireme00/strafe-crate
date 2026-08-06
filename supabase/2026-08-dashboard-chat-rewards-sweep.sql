-- Strafe Crate dashboard, community progression, and admin-control sweep
-- Run once in Supabase SQL Editor after deploying the matching repository.

begin;

-- ------------------------------------------------------------
-- 1. Dummy Recruit preview account
-- Keeps the named test account approved and displayed as Recruit.
-- This does not create a fulfillment order or charge Stripe.
-- ------------------------------------------------------------

do $$
declare
  test_user_id uuid;
  recruit_tier_id uuid;
begin
  select id into test_user_id
  from public.profiles
  where lower(email) = lower('nightscreamer10@gmail.com')
  limit 1;

  select id into recruit_tier_id
  from public.membership_tiers
  where lower(name) = 'recruit'
  limit 1;

  if test_user_id is not null and recruit_tier_id is not null then
    update public.profiles
    set account_approved = true
    where id = test_user_id;

    insert into public.subscriptions (
      user_id,
      tier_id,
      status,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      updated_at
    )
    values (
      test_user_id,
      recruit_tier_id,
      'active',
      date_trunc('month', now()),
      date_trunc('month', now()) + interval '1 month',
      false,
      now()
    )
    on conflict (user_id) do update set
      tier_id = excluded.tier_id,
      status = excluded.status,
      current_period_start = excluded.current_period_start,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = false,
      updated_at = now();
  end if;
end
$$;

-- ------------------------------------------------------------
-- 2. Chat XP and message-count trophies
-- One valid posted message = 1 lifetime XP.
-- Invalid/filtered messages never reach chat_messages and earn nothing.
-- ------------------------------------------------------------

insert into public.trophy_definitions
  (slug, name, description, icon, rarity, active)
values
  ('chatter-1000', 'Chatter', 'Posted 1,000 community messages.', 'CHAT-1K', 'common', true),
  ('super-chatter-10000', 'Super Chatter', 'Posted 10,000 community messages.', 'CHAT-10K', 'rare', true),
  ('goated-chatter-100000', 'Goated Chatter', 'Posted 100,000 community messages.', 'GOAT-100K', 'epic', true),
  ('million-chatter', 'Super Super Chatter', 'Posted 1,000,000 community messages.', 'CHAT-1M', 'legendary', true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  rarity = excluded.rarity,
  active = true;

create or replace function public.award_chat_progress()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  message_total bigint;
begin
  insert into public.loyalty_accounts(user_id)
  values (new.user_id)
  on conflict (user_id) do nothing;

  insert into public.xp_ledger(user_id, amount, reason, source_id)
  values (
    new.user_id,
    1,
    'Community message',
    'chat-message:' || new.id::text
  )
  on conflict (source_id) do nothing;

  if found then
    update public.loyalty_accounts
    set lifetime_xp = lifetime_xp + 1,
        updated_at = now()
    where user_id = new.user_id;
  end if;

  select count(*) into message_total
  from public.chat_messages
  where user_id = new.user_id
    and deleted_at is null;

  insert into public.member_trophies(user_id, trophy_id)
  select new.user_id, td.id
  from public.trophy_definitions td
  where
    (td.slug = 'chatter-1000' and message_total >= 1000)
    or (td.slug = 'super-chatter-10000' and message_total >= 10000)
    or (td.slug = 'goated-chatter-100000' and message_total >= 100000)
    or (td.slug = 'million-chatter' and message_total >= 1000000)
  on conflict (user_id, trophy_id) do nothing;

  return new;
end;
$$;

drop trigger if exists award_chat_progress_trigger
on public.chat_messages;

create trigger award_chat_progress_trigger
after insert on public.chat_messages
for each row execute function public.award_chat_progress();

-- ------------------------------------------------------------
-- 3. Direct admin moderation controls
-- ------------------------------------------------------------

alter table public.chat_bans
add column if not exists created_by uuid references public.profiles(id);

create table if not exists public.chat_admin_audit (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  target_message_id uuid references public.chat_messages(id),
  action text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_admin_audit enable row level security;

drop policy if exists "Admins view chat audit" on public.chat_admin_audit;
create policy "Admins view chat audit"
on public.chat_admin_audit for select to authenticated
using (public.is_admin());

create or replace function public.admin_chat_direct_action(
  moderation_action text,
  target_user_id uuid,
  target_message_id uuid default null
)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  admin_id uuid := auth.uid();
  mute_until timestamptz;
  result_text text;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  case moderation_action
    when 'delete_message' then
      if target_message_id is null then
        raise exception 'A message is required.';
      end if;

      update public.chat_messages
      set deleted_at = now()
      where id = target_message_id;

      result_text := 'Message deleted.';

    when 'mute_1h' then
      mute_until := now() + interval '1 hour';
      result_text := 'Member muted for 1 hour.';

    when 'mute_24h' then
      mute_until := now() + interval '24 hours';
      result_text := 'Member muted for 24 hours.';

    when 'mute_7d' then
      mute_until := now() + interval '7 days';
      result_text := 'Member muted for 7 days.';

    when 'unmute' then
      delete from public.chat_bans where user_id = target_user_id;
      result_text := 'Member mute removed.';

    else
      raise exception 'Unsupported moderation action.';
  end case;

  if moderation_action in ('mute_1h','mute_24h','mute_7d') then
    insert into public.chat_bans(user_id, reason, expires_at, created_at, created_by)
    values (
      target_user_id,
      'Direct admin mute',
      mute_until,
      now(),
      admin_id
    )
    on conflict (user_id) do update set
      reason = excluded.reason,
      expires_at = excluded.expires_at,
      created_at = now(),
      created_by = excluded.created_by;
  end if;

  insert into public.chat_admin_audit(
    admin_user_id,
    target_user_id,
    target_message_id,
    action
  )
  values (
    admin_id,
    target_user_id,
    target_message_id,
    moderation_action
  );

  return result_text;
end;
$$;

revoke all on function public.admin_chat_direct_action(text,uuid,uuid)
from public, anon;

grant execute on function public.admin_chat_direct_action(text,uuid,uuid)
to authenticated;

create or replace function public.admin_clear_chat()
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  admin_id uuid := auth.uid();
  affected integer;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  update public.chat_messages
  set deleted_at = now()
  where deleted_at is null;

  get diagnostics affected = row_count;

  insert into public.chat_admin_audit(admin_user_id, action)
  values (admin_id, 'clear_chat');

  return affected::text || ' community messages cleared.';
end;
$$;

revoke all on function public.admin_clear_chat()
from public, anon;

grant execute on function public.admin_clear_chat()
to authenticated;

-- ------------------------------------------------------------
-- 4. Player-card trophy order remains identical to cabinet slots.
-- ------------------------------------------------------------

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
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    p.id,
    coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), 'Member'),
    mt.name,
    coalesce(la.lifetime_xp, 0),
    coalesce(la.supply_credits, 0),
    coalesce(la.consecutive_paid_months, 0),
    coalesce(la.xp_multiplier, 1.00),
    public.level_from_xp(coalesce(la.lifetime_xp, 0)),
    p.created_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'name', td.name,
          'description', td.description,
          'icon', td.icon,
          'slug', td.slug,
          'rarity', td.rarity,
          'featured_slot', member_trophy.featured_slot
        )
        order by member_trophy.featured_slot nulls last,
                 member_trophy.awarded_at
      ) filter (where td.id is not null),
      '[]'::jsonb
    )
  from public.profiles p
  left join public.loyalty_accounts la on la.user_id = p.id
  left join public.subscriptions s
    on s.user_id = p.id
   and lower(coalesce(s.status::text, '')) in ('active','trialing','past_due')
  left join public.membership_tiers mt on mt.id = s.tier_id
  left join public.member_trophies member_trophy
    on member_trophy.user_id = p.id
  left join public.trophy_definitions td
    on td.id = member_trophy.trophy_id
   and td.active = true
  where p.id = target_user_id
  group by
    p.id, p.display_name, p.full_name, p.created_at,
    mt.name, la.lifetime_xp, la.supply_credits,
    la.consecutive_paid_months, la.xp_multiplier;
$$;

revoke all on function public.get_public_player_card(uuid)
from public, anon;

grant execute on function public.get_public_player_card(uuid)
to authenticated;

notify pgrst, 'reload schema';

commit;

-- Verification: reward redemption implementation already deducts credits,
-- creates reward_redemptions, creates a standalone fulfillment_orders row with
-- order_type='reward', and links fulfillment_order_id back to the redemption.
select
  'reward_redemption_function_present' as check_name,
  to_regprocedure('public.redeem_reward(text)') is not null as passed;
