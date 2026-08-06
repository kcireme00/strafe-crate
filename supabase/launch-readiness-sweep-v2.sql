-- ============================================================
-- STRAFE CRATE LAUNCH READINESS SWEEP V2
-- Rewards, fixed trophy slots, checkout readiness support,
-- strict community posting, and admin revenue/profit metrics.
-- Run as ONE new query in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. XP helper required by public player-card functions
-- ------------------------------------------------------------

create or replace function public.level_from_xp(xp_value bigint)
returns integer
language sql
immutable
as $$
  select greatest(
    1,
    floor(
      sqrt(greatest(coalesce(xp_value, 0), 0)::numeric / 100)
    )::integer + 1
  );
$$;

grant execute on function public.level_from_xp(bigint)
to anon, authenticated;

-- ------------------------------------------------------------
-- 2. THREE LIVE SUPPLY REWARDS
-- ------------------------------------------------------------

create table if not exists public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  credits_required integer not null check (credits_required > 0),
  estimated_reward_value_cents integer not null check (estimated_reward_value_cents >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.reward_catalog(id),
  credits_spent integer not null check (credits_spent > 0),
  status text not null default 'requested'
    check (status in ('requested','approved','fulfilled','declined','cancelled')),
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  admin_notes text
);

insert into public.reward_catalog
  (slug, name, description, credits_required, estimated_reward_value_cents, active)
values
  ('field-supply-cache', 'Field Supply Cache', 'One curated bonus CS2 skin with a published estimated reward value of approximately $3.50.', 20, 350, true),
  ('veteran-supply-cache', 'Veteran Supply Cache', 'A stronger curated bonus CS2 skin with a published estimated reward value of approximately $8.75.', 50, 875, true),
  ('arsenal-cache', 'Arsenal Cache', 'The highest current Supply Credit reward, with a published estimated reward value of approximately $17.50.', 100, 1750, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  credits_required = excluded.credits_required,
  estimated_reward_value_cents = excluded.estimated_reward_value_cents,
  active = true;

alter table public.reward_catalog enable row level security;
alter table public.reward_redemptions enable row level security;

drop policy if exists "Members view active rewards" on public.reward_catalog;
create policy "Members view active rewards"
on public.reward_catalog for select to authenticated
using (active = true);

drop policy if exists "Members view own reward redemptions" on public.reward_redemptions;
create policy "Members view own reward redemptions"
on public.reward_redemptions for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage reward redemptions" on public.reward_redemptions;
create policy "Admins manage reward redemptions"
on public.reward_redemptions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.reward_catalog, public.reward_redemptions to authenticated;

grant insert, update on public.reward_redemptions to authenticated;

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
  redemption_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into selected_reward
  from public.reward_catalog
  where slug = reward_slug and active = true;

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
  set supply_credits = supply_credits - selected_reward.credits_required,
      updated_at = now()
  where user_id = current_user_id;

  insert into public.credit_ledger(user_id, amount, reason, source_id)
  values (
    current_user_id,
    -selected_reward.credits_required,
    'Reward redemption: ' || selected_reward.name,
    'reward:' || gen_random_uuid()::text
  );

  insert into public.reward_redemptions(user_id, reward_id, credits_spent)
  values (current_user_id, selected_reward.id, selected_reward.credits_required)
  returning id into redemption_id;

  return redemption_id;
end;
$$;

revoke all on function public.redeem_reward(text) from public, anon;
grant execute on function public.redeem_reward(text) to authenticated;

-- ------------------------------------------------------------
-- 3. EXACT TROPHY SLOT PERSISTENCE
-- Empty slot 1 stays empty when a trophy is saved to slot 2.
-- ------------------------------------------------------------

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

  if (select count(distinct selected_id) from unnest(selected_ids) selected_id) <> selected_count then
    raise exception 'The same trophy cannot be featured in more than one slot.';
  end if;

  select count(*) into owned_count
  from public.member_trophies mt
  where mt.user_id = current_user_id
    and mt.trophy_id = any(selected_ids);

  if owned_count <> selected_count then
    raise exception 'You may only feature trophies unlocked by your account.';
  end if;

  update public.member_trophies
  set featured_slot = null
  where user_id = current_user_id
    and featured_slot is not null;

  if slot_1_trophy_id is not null then
    update public.member_trophies
    set featured_slot = 1
    where user_id = current_user_id and trophy_id = slot_1_trophy_id;
  end if;

  if slot_2_trophy_id is not null then
    update public.member_trophies
    set featured_slot = 2
    where user_id = current_user_id and trophy_id = slot_2_trophy_id;
  end if;

  if slot_3_trophy_id is not null then
    update public.member_trophies
    set featured_slot = 3
    where user_id = current_user_id and trophy_id = slot_3_trophy_id;
  end if;

  return query
  select mt.trophy_id, mt.featured_slot
  from public.member_trophies mt
  where mt.user_id = current_user_id
    and mt.featured_slot is not null
  order by mt.featured_slot;
end;
$$;

revoke all on function public.set_my_featured_trophy_slots(uuid,uuid,uuid)
from public, anon;

grant execute on function public.set_my_featured_trophy_slots(uuid,uuid,uuid)
to authenticated;

-- ------------------------------------------------------------
-- 4. STRICT COMMUNITY CHAT
-- No links. Configurable prohibited terms. Automatic timeout.
-- ------------------------------------------------------------

create table if not exists public.chat_blocked_terms (
  id uuid primary key default gen_random_uuid(),
  term text unique not null,
  category text not null default 'prohibited',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Starter profanity list. Add additional terms in this table without a code deployment.
insert into public.chat_blocked_terms(term, category)
values
  ('fuck', 'profanity'),
  ('fucking', 'profanity'),
  ('shit', 'profanity'),
  ('bitch', 'profanity'),
  ('cunt', 'profanity'),
  ('asshole', 'profanity'),
  ('motherfucker', 'profanity'),
  ('whore', 'profanity'),
  ('slut', 'profanity')
on conflict (term) do update set active = true;

-- Encoded protected-class slurs are seeded without printing them in the UI or documentation.
insert into public.chat_blocked_terms(term, category)
select convert_from(decode(encoded_term, 'base64'), 'UTF8'), 'slur'
from (values
  ('bmlnZ2Vy'),
  ('bmlnZ2E='),
  ('ZmFnZ290'),
  ('a2lrZQ=='),
  ('Y2hpbms='),
  ('c3BpYw=='),
  ('d2V0YmFjaw=='),
  ('Z29vaw=='),
  ('cmFnaGVhZA==')
) blocked(encoded_term)
on conflict (term) do update set active = true;

alter table public.chat_bans
add column if not exists violation_count integer not null default 0;

create table if not exists public.chat_filter_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  attempted_body text,
  timeout_until timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.chat_blocked_terms enable row level security;
alter table public.chat_filter_log enable row level security;

drop policy if exists "Admins manage blocked chat terms" on public.chat_blocked_terms;
create policy "Admins manage blocked chat terms"
on public.chat_blocked_terms for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins view chat filter log" on public.chat_filter_log;
create policy "Admins view chat filter log"
on public.chat_filter_log for select to authenticated
using (public.is_admin());

grant select, insert, update, delete on public.chat_blocked_terms to authenticated;
grant select on public.chat_filter_log to authenticated;

create or replace function public.post_chat_message(message_body text)
returns table (
  posted boolean,
  message text,
  message_id uuid,
  timeout_until timestamptz
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  clean_body text := trim(coalesce(message_body, ''));
  matched_term text;
  active_ban_until timestamptz;
  previous_violations integer := 0;
  new_timeout_until timestamptz;
  inserted_message_id uuid;
begin
  if current_user_id is null then
    return query select false, 'Authentication required.', null::uuid, null::timestamptz;
    return;
  end if;

  if char_length(clean_body) < 1 or char_length(clean_body) > 500 then
    return query select false, 'Messages must contain between 1 and 500 characters.', null::uuid, null::timestamptz;
    return;
  end if;

  select cb.expires_at into active_ban_until
  from public.chat_bans cb
  where cb.user_id = current_user_id
    and (cb.expires_at is null or cb.expires_at > now());

  if found then
    return query select false, 'Chat access is currently restricted.', null::uuid, active_ban_until;
    return;
  end if;

  -- Links, invite codes, domains, and Steam trade URLs are prohibited.
  if clean_body ~* '(https?://|www\.|steamcommunity\.com/tradeoffer|discord\.gg|[a-z0-9-]+\.(com|net|org|gg|io|co)(/|\y))' then
    matched_term := 'link';
  else
    select term into matched_term
    from public.chat_blocked_terms
    where active = true
      and clean_body ~* ('(^|[^a-z0-9])' || regexp_replace(term, '([\\.^$|()\[\]{}*+?\\-])', '\\\1', 'g') || '([^a-z0-9]|$)')
    order by char_length(term) desc
    limit 1;
  end if;

  if matched_term is not null then
    select coalesce(violation_count, 0) into previous_violations
    from public.chat_bans
    where user_id = current_user_id;

    new_timeout_until := now() + case
      when previous_violations >= 2 then interval '7 days'
      when previous_violations = 1 then interval '24 hours'
      else interval '1 hour'
    end;

    insert into public.chat_bans(user_id, reason, expires_at, created_at, violation_count)
    values (
      current_user_id,
      'Automatic community filter violation',
      new_timeout_until,
      now(),
      previous_violations + 1
    )
    on conflict (user_id) do update set
      reason = excluded.reason,
      expires_at = excluded.expires_at,
      created_at = now(),
      violation_count = public.chat_bans.violation_count + 1;

    insert into public.chat_filter_log(user_id, reason, attempted_body, timeout_until)
    values (
      current_user_id,
      case when matched_term = 'link' then 'Prohibited link' else 'Prohibited language' end,
      clean_body,
      new_timeout_until
    );

    return query select
      false,
      case
        when matched_term = 'link' then 'Links are not permitted. Your chat access has been temporarily restricted.'
        else 'Prohibited language is not permitted. Your chat access has been temporarily restricted.'
      end,
      null::uuid,
      new_timeout_until;
    return;
  end if;

  insert into public.chat_messages(user_id, body)
  values (current_user_id, clean_body)
  returning id into inserted_message_id;

  return query select true, 'Message posted.', inserted_message_id, null::timestamptz;
end;
$$;

revoke all on function public.post_chat_message(text) from public, anon;
grant execute on function public.post_chat_message(text) to authenticated;

-- Direct inserts are removed so every new message must pass the RPC filter.
revoke insert on public.chat_messages from authenticated;

-- ------------------------------------------------------------
-- 5. ADMIN REVENUE / PROFIT METRICS
-- Uses non-test fulfillment cycles as the recorded paid-cycle ledger.
-- Revenue = membership tier monthly price.
-- Profit = revenue - recorded acquisition cost.
-- Fiscal year is January 1 through December 31.
-- ------------------------------------------------------------

alter table public.fulfillment_orders
add column if not exists is_test boolean not null default false;

create or replace function public.get_admin_business_metrics()
returns table (
  period_key text,
  revenue_cents bigint,
  cost_cents bigint,
  profit_cents bigint,
  order_count bigint
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with valid_orders as (
    select
      fo.id,
      coalesce(fo.cycle_month, date_trunc('month', fo.created_at)::date) as effective_cycle,
      coalesce(mt.monthly_price_cents, 0)::bigint as revenue_cents,
      round(coalesce(fo.acquisition_cost, 0) * 100)::bigint as cost_cents
    from public.fulfillment_orders fo
    left join public.membership_tiers mt
      on lower(mt.name) = lower(fo.tier_name)
    where coalesce(fo.is_test, false) = false
      and fo.status::text not in (
        'payment_failed','failed','cancelled','declined','expired','issue'
      )
  ),
  periods(period_key, start_date) as (
    values
      ('current_month'::text, date_trunc('month', current_date)::date),
      ('fiscal_year'::text, date_trunc('year', current_date)::date),
      ('lifetime'::text, date '1900-01-01')
  )
  select
    p.period_key,
    coalesce(sum(v.revenue_cents), 0)::bigint,
    coalesce(sum(v.cost_cents), 0)::bigint,
    coalesce(sum(v.revenue_cents - v.cost_cents), 0)::bigint,
    count(v.id)::bigint
  from periods p
  left join valid_orders v
    on v.effective_cycle >= p.start_date
  group by p.period_key
  order by case p.period_key
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

select 'reward_catalog' as item, count(*)::text as result
from public.reward_catalog where active = true
union all
select 'blocked_terms', count(*)::text
from public.chat_blocked_terms where active = true
union all
select 'admin_metrics_function',
  case when to_regprocedure('public.get_admin_business_metrics()') is not null then 'ready' else 'missing' end;
