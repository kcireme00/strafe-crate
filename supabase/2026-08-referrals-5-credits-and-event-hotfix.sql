-- Strafe Crate referral program + Sand Dune event hotfix
-- Referral reward: 5 Supply Credits to the referrer when the referred member
-- activates a Stripe membership (active or trialing). One reward per referred account.

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- REFERRAL PROGRAM
-- ------------------------------------------------------------

create table if not exists public.referral_codes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique
    references public.profiles(id) on delete cascade,
  code text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint referral_codes_format_check
    check (code ~ '^[A-Za-z0-9_-]{3,24}$')
);

create unique index if not exists referral_codes_lower_code_key
on public.referral_codes(lower(code));

create table if not exists public.referral_attributions (
  referred_user_id uuid primary key
    references public.profiles(id) on delete cascade,
  referral_code_id uuid not null
    references public.referral_codes(id) on delete restrict,
  referrer_user_id uuid not null
    references public.profiles(id) on delete cascade,
  captured_at timestamptz not null default now(),
  activated_at timestamptz,
  credits_awarded integer not null default 0
    check (credits_awarded >= 0),
  activation_subscription_id text
);

create index if not exists referral_attributions_referrer_idx
on public.referral_attributions(referrer_user_id, captured_at desc);


-- Persist referral attribution to the backend as soon as the member profile is
-- created. It does NOT depend on the member subscribing immediately.
create or replace function public.persist_signup_referral()
returns trigger
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  signup_code text;
  selected_code public.referral_codes%rowtype;
begin
  select upper(trim(coalesce(
    au.raw_user_meta_data ->> 'referral_code',
    ''
  )))
  into signup_code
  from auth.users au
  where au.id = new.id;

  if signup_code = '' then
    return new;
  end if;

  select rc.*
  into selected_code
  from public.referral_codes rc
  where lower(rc.code) = lower(signup_code)
    and rc.active = true
  limit 1;

  if selected_code.id is null
     or selected_code.owner_user_id = new.id then
    return new;
  end if;

  insert into public.referral_attributions(
    referred_user_id,
    referral_code_id,
    referrer_user_id
  )
  values (
    new.id,
    selected_code.id,
    selected_code.owner_user_id
  )
  on conflict (referred_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists persist_signup_referral_trigger
on public.profiles;

create trigger persist_signup_referral_trigger
after insert on public.profiles
for each row
execute function public.persist_signup_referral();


alter table public.referral_codes enable row level security;
alter table public.referral_attributions enable row level security;

grant select on public.referral_codes to authenticated;
grant select on public.referral_attributions to authenticated;

drop policy if exists "Members view own referral code"
on public.referral_codes;
create policy "Members view own referral code"
on public.referral_codes
for select to authenticated
using (owner_user_id = auth.uid() or public.is_admin());

drop policy if exists "Members view referral relationships"
on public.referral_attributions;
create policy "Members view referral relationships"
on public.referral_attributions
for select to authenticated
using (
  referred_user_id = auth.uid()
  or referrer_user_id = auth.uid()
  or public.is_admin()
);

-- Create or rename your personal referral code.
create or replace function public.set_my_referral_code(desired_code text)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  clean_code text := upper(trim(coalesce(desired_code, '')));
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if clean_code !~ '^[A-Z0-9_-]{3,24}$' then
    raise exception 'Referral codes must be 3-24 characters using letters, numbers, _ or -.';
  end if;

  if exists (
    select 1
    from public.referral_codes rc
    where lower(rc.code) = lower(clean_code)
      and rc.owner_user_id <> current_user_id
  ) then
    raise exception 'That referral code is already taken.';
  end if;

  insert into public.referral_codes(owner_user_id, code, active, updated_at)
  values (current_user_id, clean_code, true, now())
  on conflict (owner_user_id)
  do update set
    code = excluded.code,
    active = true,
    updated_at = now();

  return clean_code;
end;
$$;

revoke all on function public.set_my_referral_code(text)
from public, anon;
grant execute on function public.set_my_referral_code(text)
to authenticated;

-- Attach a referral code to the current member. This can happen after email
-- verification/login because the browser preserves ?ref= locally.
create or replace function public.claim_referral_code(referral_code text)
returns boolean
language plpgsql
security definer
set search_path = public, auth
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  selected_code public.referral_codes%rowtype;
  signup_referral_code text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1
    from public.referral_attributions ra
    where ra.referred_user_id = current_user_id
  ) then
    return false;
  end if;

  -- The referral must have been stored when this account was originally
  -- created. Clicking a referral link later with an old account cannot earn
  -- somebody credits.
  select upper(trim(coalesce(
    au.raw_user_meta_data ->> 'referral_code',
    ''
  )))
  into signup_referral_code
  from auth.users au
  where au.id = current_user_id;

  if signup_referral_code = ''
     or signup_referral_code <> upper(trim(coalesce(referral_code, ''))) then
    raise exception 'This referral was not attached when the account was created.';
  end if;

  select rc.*
  into selected_code
  from public.referral_codes rc
  where lower(rc.code) = lower(trim(coalesce(referral_code, '')))
    and rc.active = true
  limit 1;

  if selected_code.id is null then
    raise exception 'Referral code not found.';
  end if;

  if selected_code.owner_user_id = current_user_id then
    raise exception 'You cannot use your own referral code.';
  end if;

  insert into public.referral_attributions(
    referred_user_id,
    referral_code_id,
    referrer_user_id
  )
  values (
    current_user_id,
    selected_code.id,
    selected_code.owner_user_id
  )
  on conflict (referred_user_id) do nothing;

  return true;
end;
$$;

revoke all on function public.claim_referral_code(text)
from public, anon;
grant execute on function public.claim_referral_code(text)
to authenticated;

-- Dashboard summary for the code owner.
create or replace function public.get_my_referral_program()
returns table (
  code text,
  total_signups bigint,
  activated_members bigint,
  credits_earned bigint
)
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  return query
  select
    rc.code,
    count(ra.referred_user_id)::bigint,
    count(ra.referred_user_id) filter (where ra.activated_at is not null)::bigint,
    coalesce(sum(ra.credits_awarded), 0)::bigint
  from public.referral_codes rc
  left join public.referral_attributions ra
    on ra.referrer_user_id = rc.owner_user_id
  where rc.owner_user_id = current_user_id
  group by rc.code;
end;
$$;

revoke all on function public.get_my_referral_program()
from public, anon;
grant execute on function public.get_my_referral_program()
to authenticated;

-- Called from the trusted Stripe webhook after checkout creates an active or
-- trialing membership. It is idempotent: the same referred account can award
-- credits exactly once.
create or replace function public.activate_referral_for_member(
  target_user_id uuid,
  stripe_subscription_id text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  attribution public.referral_attributions%rowtype;
  subscription_active boolean := false;
  ledger_source text;
begin
  select exists (
    select 1
    from public.subscriptions s
    where s.user_id = target_user_id
      and lower(coalesce(s.status, '')) in ('active', 'trialing')
  )
  into subscription_active;

  if not subscription_active then
    return false;
  end if;

  select ra.*
  into attribution
  from public.referral_attributions ra
  where ra.referred_user_id = target_user_id
  for update;

  if attribution.referred_user_id is null then
    return false;
  end if;

  if attribution.activated_at is not null
     or attribution.credits_awarded > 0 then
    return false;
  end if;

  ledger_source := 'referral-activation:' || target_user_id::text;

  -- Ledger-level idempotency as a second safety layer.
  if exists (
    select 1
    from public.credit_ledger cl
    where cl.source_id = ledger_source
  ) then
    update public.referral_attributions
    set
      activated_at = coalesce(activated_at, now()),
      credits_awarded = greatest(credits_awarded, 5),
      activation_subscription_id =
        coalesce(activation_subscription_id, stripe_subscription_id)
    where referred_user_id = target_user_id;

    return false;
  end if;

  insert into public.loyalty_accounts(user_id)
  values (attribution.referrer_user_id)
  on conflict (user_id) do nothing;

  update public.loyalty_accounts
  set
    supply_credits = supply_credits + 5,
    updated_at = now()
  where user_id = attribution.referrer_user_id;

  insert into public.credit_ledger(
    user_id,
    amount,
    reason,
    source_id
  )
  values (
    attribution.referrer_user_id,
    5,
    'Referral membership activation',
    ledger_source
  );

  update public.referral_attributions
  set
    activated_at = now(),
    credits_awarded = 5,
    activation_subscription_id = stripe_subscription_id
  where referred_user_id = target_user_id;

  return true;
end;
$$;

revoke all on function public.activate_referral_for_member(uuid,text)
from public, anon, authenticated;
grant execute on function public.activate_referral_for_member(uuid,text)
to service_role;

-- ------------------------------------------------------------
-- SAND DUNE EVENT: FIX AMBIGUOUS trophy_id VARIABLE
-- ------------------------------------------------------------

create or replace function public.admin_process_launch_event_claim(
  target_claim_id uuid,
  claim_action text
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  claim_row public.launch_event_claims%rowtype;
  profile_trade_url text;
  v_trophy_definition_id uuid;
  created_order_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  select lec.*
  into claim_row
  from public.launch_event_claims lec
  where lec.id = target_claim_id
  for update;

  if not found then
    raise exception 'Event claim not found.';
  end if;

  if claim_action = 'reject' then
    update public.launch_event_claims
    set
      status = 'rejected',
      verified_by = auth.uid(),
      verified_at = now(),
      updated_at = now()
    where id = target_claim_id;

    return null;
  end if;

  if claim_action <> 'approve' then
    raise exception 'Unsupported event action.';
  end if;

  select nullif(trim(p.steam_trade_url), '')
  into profile_trade_url
  from public.profiles p
  where p.id = claim_row.user_id;

  if profile_trade_url is null then
    raise exception 'This member must save a valid Steam Trade URL first.';
  end if;

  select td.id
  into v_trophy_definition_id
  from public.trophy_definitions td
  where td.slug = 'launch-sand-dollar'
  limit 1;

  if v_trophy_definition_id is null then
    raise exception 'Sand Dollar trophy definition is missing.';
  end if;

  insert into public.member_trophies(user_id, trophy_id)
  values (claim_row.user_id, v_trophy_definition_id)
  on conflict (user_id, trophy_id) do nothing;

  if claim_row.reward_order_id is null then
    insert into public.fulfillment_orders(
      user_id,
      cycle_month,
      tier_name,
      weapon_category,
      skin_name,
      exterior,
      steam_reference_value,
      acquisition_cost,
      status,
      admin_notes,
      created_by
    )
    values (
      claim_row.user_id,
      date '2026-09-01',
      'Event Reward',
      'P250',
      'Sand Dune',
      'Admin choice',
      0,
      0,
      'draft',
      'September 2026 launch sponsorship reward. Verify Steam username includes StrafeCrate.com before sending.',
      auth.uid()
    )
    returning id into created_order_id;
  else
    created_order_id := claim_row.reward_order_id;
  end if;

  update public.launch_event_claims
  set
    status = 'approved',
    verified_by = auth.uid(),
    verified_at = now(),
    reward_order_id = created_order_id,
    updated_at = now()
  where id = target_claim_id;

  return created_order_id;
end;
$$;

revoke all on function public.admin_process_launch_event_claim(uuid,text)
from public, anon;
grant execute on function public.admin_process_launch_event_claim(uuid,text)
to authenticated;

notify pgrst, 'reload schema';

commit;
