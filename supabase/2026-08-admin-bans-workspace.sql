begin;

create or replace function public.get_admin_chat_bans()
returns table (
  user_id uuid,
  display_name text,
  email text,
  reason text,
  expires_at timestamptz,
  created_at timestamptz,
  created_by_name text,
  permanent boolean
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    cb.user_id,
    coalesce(nullif(trim(p.display_name),''),nullif(trim(p.full_name),''),'Member'),
    p.email,
    cb.reason,
    cb.expires_at,
    cb.created_at,
    coalesce(nullif(trim(admin.display_name),''),nullif(trim(admin.full_name),''),'Admin'),
    cb.expires_at is null
  from public.chat_bans cb
  join public.profiles p on p.id = cb.user_id
  left join public.profiles admin on admin.id = cb.created_by
  where public.is_admin()
    and (cb.expires_at is null or cb.expires_at > now())
  order by (cb.expires_at is null) desc, cb.created_at desc;
$$;

revoke all on function public.get_admin_chat_bans() from public, anon;
grant execute on function public.get_admin_chat_bans() to authenticated;

create or replace function public.admin_remove_chat_ban(target_user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin() then raise exception 'Admin permission required.'; end if;
  delete from public.chat_bans where user_id = target_user_id;
  insert into public.moderation_log(admin_id,target_user_id,action,reason)
  values(auth.uid(),target_user_id,'remove_ban','Removed from bans workspace');
  return 'Chat restriction removed.';
end;
$$;

revoke all on function public.admin_remove_chat_ban(uuid) from public, anon;
grant execute on function public.admin_remove_chat_ban(uuid) to authenticated;

notify pgrst, 'reload schema';
commit;
