-- Strafe Crate: allow admins to save fulfillment orders without a Steam trade URL
-- Run once in Supabase SQL Editor.

begin;

-- Remove the database trigger that blocked status/order saves whenever the
-- member had not yet entered a valid Steam trade URL.
drop trigger if exists require_fulfillment_ready_profile_trigger
on public.fulfillment_orders;

-- Keep the function available for historical migrations, but make it
-- non-blocking in case another trigger or RPC still references it.
create or replace function public.require_fulfillment_ready_profile()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  return new;
end;
$$;

notify pgrst, 'reload schema';

commit;
