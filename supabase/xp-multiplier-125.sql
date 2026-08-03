-- ============================================================
-- STRAFE CRATE XP MULTIPLIER UPDATE
-- Permanent loyalty multiplier: up to 1.25x after 12 paid months.
-- Supply Credits remain unchanged and are never multiplied.
-- Run once in Supabase SQL Editor.
-- ============================================================

do $$
declare
  constraint_record record;
begin
  if to_regclass('public.loyalty_accounts') is null then
    raise exception 'public.loyalty_accounts does not exist. Run the loyalty setup first.';
  end if;

  for constraint_record in
    select c.conname
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public'
      and t.relname = 'loyalty_accounts'
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%xp_multiplier%'
  loop
    execute format(
      'alter table public.loyalty_accounts drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end $$;

alter table public.loyalty_accounts
  add constraint loyalty_accounts_xp_multiplier_range
  check (xp_multiplier between 1.00 and 1.25);

update public.loyalty_accounts
set xp_multiplier = case
  when consecutive_paid_months >= 12 then 1.25
  when consecutive_paid_months >= 9 then 1.15
  when consecutive_paid_months >= 6 then 1.10
  when consecutive_paid_months >= 3 then 1.05
  else 1.00
end,
updated_at = now();

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
    select 1
    from public.xp_ledger
    where source_id = payment_source_id
  ) then
    return query
    select
      0,
      0,
      la.lifetime_xp,
      la.supply_credits,
      la.xp_multiplier
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
    when next_months >= 12 then 1.25
    when next_months >= 9 then 1.15
    when next_months >= 6 then 1.10
    when next_months >= 3 then 1.05
    else 1.00
  end;

  final_xp := floor(base_xp * multiplier);

  insert into public.xp_ledger (
    user_id,
    amount,
    reason,
    source_id
  )
  values (
    target_user_id,
    final_xp,
    'Successful ' || tier_slug || ' subscription renewal',
    payment_source_id
  );

  insert into public.credit_ledger (
    user_id,
    amount,
    reason,
    source_id
  )
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

revoke all
on function public.award_subscription_loyalty(uuid, text, text)
from public, anon, authenticated;

grant execute
on function public.award_subscription_loyalty(uuid, text, text)
to service_role;

notify pgrst, 'reload schema';

select
  consecutive_paid_months,
  xp_multiplier
from public.loyalty_accounts
order by consecutive_paid_months desc;
