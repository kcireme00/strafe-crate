-- Strafe Crate permanent admin mute support
-- Run once in Supabase SQL Editor after deploying the matching repository.

begin;

alter table public.chat_bans
add column if not exists created_by uuid references public.profiles(id);

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

    when 'mute_forever' then
      mute_until := null;
      result_text := 'Member muted permanently.';

    when 'unmute' then
      delete from public.chat_bans
      where user_id = target_user_id;

      result_text := 'Member mute removed.';

    else
      raise exception 'Unsupported moderation action.';
  end case;

  if moderation_action in ('mute_1h','mute_24h','mute_7d','mute_forever') then
    insert into public.chat_bans(
      user_id,
      reason,
      expires_at,
      created_at,
      created_by
    )
    values (
      target_user_id,
      case
        when moderation_action = 'mute_forever'
          then 'Permanent direct admin mute'
        else 'Direct admin mute'
      end,
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

notify pgrst, 'reload schema';

commit;
