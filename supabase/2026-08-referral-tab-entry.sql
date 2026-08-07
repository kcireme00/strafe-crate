-- Referral tab: allow an existing account to apply a referral code only
-- before that account has ever activated a membership.

create or replace function public.claim_referral_before_membership(referral_code text)
returns boolean
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  selected_code public.referral_codes%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1
    from public.subscriptions s
    where s.user_id = current_user_id
      and lower(coalesce(s.status, '')) in
        ('active','trialing','past_due','canceled','unpaid','paused')
  ) then
    raise exception 'Referral codes can only be applied before your first membership activation.';
  end if;

  if exists (
    select 1 from public.referral_attributions ra
    where ra.referred_user_id = current_user_id
  ) then
    raise exception 'A referral code is already attached to this account.';
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
    referred_user_id, referral_code_id, referrer_user_id
  )
  values (
    current_user_id, selected_code.id, selected_code.owner_user_id
  );

  return true;
end;
$$;

revoke all on function public.claim_referral_before_membership(text)
from public, anon;
grant execute on function public.claim_referral_before_membership(text)
to authenticated;

notify pgrst, 'reload schema';
