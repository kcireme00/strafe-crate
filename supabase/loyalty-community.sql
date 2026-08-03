
-- ============================================================
-- STRAFE CRATE LOYALTY + COMMUNITY MVP
-- Run once in Supabase SQL Editor.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- LOYALTY ACCOUNTS
-- XP never decreases. Supply Credits are redeemable.
-- ------------------------------------------------------------

create table if not exists public.loyalty_accounts (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  lifetime_xp bigint not null default 0 check (lifetime_xp >= 0),
  supply_credits integer not null default 0 check (supply_credits >= 0),
  consecutive_paid_months integer not null default 0 check (consecutive_paid_months >= 0),
  xp_multiplier numeric(4,2) not null default 1.00 check (xp_multiplier between 1.00 and 1.10),
  updated_at timestamptz not null default now()
);

create table if not exists public.xp_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount > 0),
  reason text not null,
  source_id text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null,
  reason text not null,
  source_id text unique,
  created_at timestamptz not null default now()
);

insert into public.loyalty_accounts (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function public.handle_new_loyalty_account()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.loyalty_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_create_loyalty on public.profiles;
create trigger on_profile_created_create_loyalty
after insert on public.profiles
for each row execute function public.handle_new_loyalty_account();

-- ------------------------------------------------------------
-- REWARD CATALOG
-- One credit is presented as roughly $0.175 estimated reward
-- contribution. Credits have no cash value and are not withdrawable.
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

insert into public.reward_catalog
  (slug, name, description, credits_required, estimated_reward_value_cents)
values
  (
    'field-supply-cache',
    'Field Supply Cache',
    'One curated bonus CS2 skin with a published estimated reward value.',
    20,
    350
  ),
  (
    'veteran-supply-cache',
    'Veteran Supply Cache',
    'A stronger curated bonus CS2 skin for established collectors.',
    50,
    875
  ),
  (
    'arsenal-cache',
    'Arsenal Cache',
    'The highest loyalty reward currently available.',
    100,
    1750
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  credits_required = excluded.credits_required,
  estimated_reward_value_cents = excluded.estimated_reward_value_cents,
  active = true;

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.reward_catalog(id),
  credits_spent integer not null,
  status text not null default 'submitted'
    check (status in ('submitted','approved','fulfilled','rejected','cancelled')),
  submitted_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  internal_notes text
);

-- ------------------------------------------------------------
-- TROPHIES
-- ------------------------------------------------------------

create table if not exists public.trophy_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  icon text not null,
  rarity text not null default 'common'
    check (rarity in ('common','rare','epic','legendary')),
  active boolean not null default true
);

insert into public.trophy_definitions
  (slug, name, description, icon, rarity)
values
  ('founding-member', 'Founding Member', 'Joined during the founding membership period.', '◆', 'legendary'),
  ('first-drop', 'First Drop', 'Completed the first monthly fulfillment cycle.', '◈', 'common'),
  ('six-month-collector', 'Six Month Collector', 'Completed six consecutive paid cycles.', 'VI', 'rare'),
  ('one-year-collector', 'One Year Collector', 'Completed twelve consecutive paid cycles.', 'XII', 'epic'),
  ('weapon-master', 'Weapon Master', 'Completed a full eligible weapon rotation.', '✦', 'legendary'),
  ('upgrade-veteran', 'Upgrade Veteran', 'Completed five approved item upgrades.', '↟', 'epic'),
  ('community-regular', 'Community Regular', 'Recognized for positive community participation.', '●', 'rare'),
  ('helpful-member', 'Helpful Member', 'Awarded by the Strafe Crate team for helping others.', '+', 'epic')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  rarity = excluded.rarity,
  active = true;

create table if not exists public.member_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trophy_id uuid not null references public.trophy_definitions(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  featured_slot smallint check (featured_slot between 1 and 3),
  unique (user_id, trophy_id),
  unique (user_id, featured_slot)
);

-- ------------------------------------------------------------
-- COMMUNITY CHAT
-- Snapshot fields are filled by a trigger so users cannot spoof
-- names, levels, or tiers in messages.
-- ------------------------------------------------------------

create table if not exists public.chat_bans (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  display_name_snapshot text not null,
  tier_name_snapshot text,
  level_snapshot integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_created_idx
on public.chat_messages (created_at desc);

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'Member report',
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

create or replace function public.level_from_xp(xp bigint)
returns integer
language sql
immutable
as $$
  select greatest(1, floor(sqrt(greatest(xp, 0)::numeric / 100))::integer + 1);
$$;

create or replace function public.prepare_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  profile_name text;
  tier_name text;
  member_level integer;
  recent_message timestamptz;
  banned boolean;
begin
  if new.user_id <> auth.uid() then
    raise exception 'Cannot post for another user.';
  end if;

  select exists (
    select 1
    from public.chat_bans
    where user_id = new.user_id
      and (expires_at is null or expires_at > now())
  ) into banned;

  if banned then
    raise exception 'Chat access is currently restricted.';
  end if;

  select max(created_at)
  into recent_message
  from public.chat_messages
  where user_id = new.user_id;

  if recent_message is not null and recent_message > now() - interval '5 seconds' then
    raise exception 'Please wait a few seconds before posting again.';
  end if;

  select
    coalesce(nullif(p.display_name, ''), nullif(p.full_name, ''), 'Member'),
    mt.name,
    public.level_from_xp(coalesce(la.lifetime_xp, 0))
  into profile_name, tier_name, member_level
  from public.profiles p
  left join public.subscriptions s
    on s.user_id = p.id
  left join public.membership_tiers mt
    on mt.id = s.tier_id
  left join public.loyalty_accounts la
    on la.user_id = p.id
  where p.id = new.user_id;

  new.body := trim(new.body);
  new.display_name_snapshot := profile_name;
  new.tier_name_snapshot := tier_name;
  new.level_snapshot := coalesce(member_level, 1);
  return new;
end;
$$;

drop trigger if exists prepare_chat_message_trigger on public.chat_messages;
create trigger prepare_chat_message_trigger
before insert on public.chat_messages
for each row execute function public.prepare_chat_message();

-- ------------------------------------------------------------
-- SAFE PUBLIC PLAYER CARD RPC
-- Only returns fields intended for authenticated community users.
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
          'rarity', td.rarity,
          'featured_slot', mtp.featured_slot
        )
        order by mtp.featured_slot nulls last, mtp.awarded_at
      ) filter (where td.id is not null),
      '[]'::jsonb
    )
  from public.profiles p
  left join public.loyalty_accounts la on la.user_id = p.id
  left join public.subscriptions s on s.user_id = p.id
  left join public.membership_tiers mt on mt.id = s.tier_id
  left join public.member_trophies mtp on mtp.user_id = p.id
  left join public.trophy_definitions td on td.id = mtp.trophy_id
  where p.id = target_user_id
  group by p.id, p.display_name, p.full_name, p.created_at,
           mt.name, la.lifetime_xp, la.supply_credits,
           la.consecutive_paid_months, la.xp_multiplier;
$$;

grant execute on function public.get_public_player_card(uuid) to authenticated;

-- ------------------------------------------------------------
-- IDEMPOTENT MONTHLY LOYALTY AWARD FUNCTION
-- Call this from the future Stripe webhook after a successful
-- recurring invoice payment.
--
-- Conservative Supply Credits:
-- Recruit 1, Operative 1, Vanguard 2, Elite 3, Master 4, Prestige 6.
-- Credits are NOT multiplied.
-- XP multiplier caps at 1.10x after 36 paid months.
-- ------------------------------------------------------------

create or replace function public.award_subscription_loyalty(
  target_user_id uuid,
  tier_slug text,
  payment_source_id text
)
returns table (
  xp_awarded integer,
  credits_awarded integer,
  new_lifetime_xp bigint,
  new_supply_credits integer,
  new_multiplier numeric
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  base_xp integer;
  base_credits integer;
  current_months integer;
  next_months integer;
  multiplier numeric(4,2);
  final_xp integer;
begin
  if exists (
    select 1 from public.xp_ledger where source_id = payment_source_id
  ) then
    return query
    select 0, 0, la.lifetime_xp, la.supply_credits, la.xp_multiplier
    from public.loyalty_accounts la
    where la.user_id = target_user_id;
    return;
  end if;

  base_xp := case lower(tier_slug)
    when 'recruit' then 100
    when 'operative' then 200
    when 'vanguard' then 300
    when 'elite' then 400
    when 'master' then 600
    when 'prestige' then 800
    else 0
  end;

  base_credits := case lower(tier_slug)
    when 'recruit' then 1
    when 'operative' then 1
    when 'vanguard' then 2
    when 'elite' then 3
    when 'master' then 4
    when 'prestige' then 6
    else 0
  end;

  if base_xp = 0 then
    raise exception 'Unknown membership tier.';
  end if;

  insert into public.loyalty_accounts (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

  select consecutive_paid_months
  into current_months
  from public.loyalty_accounts
  where user_id = target_user_id
  for update;

  next_months := current_months + 1;

  multiplier := case
    when next_months >= 36 then 1.10
    when next_months >= 24 then 1.08
    when next_months >= 12 then 1.06
    when next_months >= 6 then 1.04
    when next_months >= 3 then 1.02
    else 1.00
  end;

  final_xp := floor(base_xp * multiplier);

  insert into public.xp_ledger (user_id, amount, reason, source_id)
  values (
    target_user_id,
    final_xp,
    'Successful ' || tier_slug || ' subscription renewal',
    payment_source_id
  );

  insert into public.credit_ledger (user_id, amount, reason, source_id)
  values (
    target_user_id,
    base_credits,
    'Successful ' || tier_slug || ' subscription renewal',
    payment_source_id || ':credits'
  );

  update public.loyalty_accounts
  set
    lifetime_xp = lifetime_xp + final_xp,
    supply_credits = supply_credits + base_credits,
    consecutive_paid_months = next_months,
    xp_multiplier = multiplier,
    updated_at = now()
  where user_id = target_user_id;

  return query
  select
    final_xp,
    base_credits,
    la.lifetime_xp,
    la.supply_credits,
    la.xp_multiplier
  from public.loyalty_accounts la
  where la.user_id = target_user_id;
end;
$$;

revoke all on function public.award_subscription_loyalty(uuid,text,text) from public, anon, authenticated;
grant execute on function public.award_subscription_loyalty(uuid,text,text) to service_role;

-- ------------------------------------------------------------
-- REWARD REDEMPTION RPC
-- Deducts credits atomically.
-- ------------------------------------------------------------

create or replace function public.redeem_reward(reward_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  uid uuid := auth.uid();
  reward_row public.reward_catalog;
  redemption_id uuid;
begin
  if uid is null then raise exception 'Authentication required.'; end if;

  select * into reward_row
  from public.reward_catalog
  where slug = reward_slug and active = true;

  if reward_row.id is null then raise exception 'Reward not available.'; end if;

  update public.loyalty_accounts
  set supply_credits = supply_credits - reward_row.credits_required,
      updated_at = now()
  where user_id = uid
    and supply_credits >= reward_row.credits_required;

  if not found then raise exception 'Not enough Supply Credits.'; end if;

  insert into public.credit_ledger (user_id, amount, reason)
  values (uid, -reward_row.credits_required, 'Redeemed ' || reward_row.name);

  insert into public.reward_redemptions
    (user_id, reward_id, credits_spent)
  values
    (uid, reward_row.id, reward_row.credits_required)
  returning id into redemption_id;

  return redemption_id;
end;
$$;

grant execute on function public.redeem_reward(text) to authenticated;

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table public.loyalty_accounts enable row level security;
alter table public.xp_ledger enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.reward_catalog enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.trophy_definitions enable row level security;
alter table public.member_trophies enable row level security;
alter table public.chat_bans enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_reports enable row level security;

drop policy if exists "Members view own loyalty" on public.loyalty_accounts;
create policy "Members view own loyalty"
on public.loyalty_accounts for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Members view own xp ledger" on public.xp_ledger;
create policy "Members view own xp ledger"
on public.xp_ledger for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Members view own credit ledger" on public.credit_ledger;
create policy "Members view own credit ledger"
on public.credit_ledger for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated view rewards" on public.reward_catalog;
create policy "Authenticated view rewards"
on public.reward_catalog for select to authenticated
using (active = true);

drop policy if exists "Members view own redemptions" on public.reward_redemptions;
create policy "Members view own redemptions"
on public.reward_redemptions for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated view trophy definitions" on public.trophy_definitions;
create policy "Authenticated view trophy definitions"
on public.trophy_definitions for select to authenticated
using (active = true);

drop policy if exists "Members view own trophies" on public.member_trophies;
create policy "Members view own trophies"
on public.member_trophies for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Authenticated read chat" on public.chat_messages;
create policy "Authenticated read chat"
on public.chat_messages for select to authenticated
using (deleted_at is null or public.is_admin());

drop policy if exists "Members post own chat messages" on public.chat_messages;
create policy "Members post own chat messages"
on public.chat_messages for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Members submit chat reports" on public.chat_reports;
create policy "Members submit chat reports"
on public.chat_reports for insert to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Members view own reports" on public.chat_reports;
create policy "Members view own reports"
on public.chat_reports for select to authenticated
using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage loyalty accounts" on public.loyalty_accounts;
create policy "Admins manage loyalty accounts"
on public.loyalty_accounts for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage trophies" on public.member_trophies;
create policy "Admins manage trophies"
on public.member_trophies for all to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage chat" on public.chat_messages;
create policy "Admins manage chat"
on public.chat_messages for update to authenticated
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage redemptions" on public.reward_redemptions;
create policy "Admins manage redemptions"
on public.reward_redemptions for all to authenticated
using (public.is_admin()) with check (public.is_admin());

grant select on public.loyalty_accounts, public.xp_ledger, public.credit_ledger,
  public.reward_catalog, public.reward_redemptions, public.trophy_definitions,
  public.member_trophies, public.chat_messages, public.chat_reports
to authenticated;

grant insert on public.chat_messages, public.chat_reports to authenticated;

-- Realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

select 'Loyalty, rewards, trophies, and community chat created' as result;
