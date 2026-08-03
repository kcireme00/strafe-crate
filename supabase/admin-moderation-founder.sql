-- ============================================================
-- STRAFE CRATE ADMIN MODERATION + FOUNDER SETUP
-- Run in the same Supabase project used by the live website.
--
-- Grants admin access and a featured Founding Member trophy to:
-- tyler.m.emerick@gmail.com
--
-- Adds:
-- - admin report inbox support
-- - message deletion
-- - dismiss report
-- - 1 hour / 24 hour / 7 day timeouts
-- - permanent chat bans
-- - moderation audit log
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- 1. SAFE ADMIN CHECK
-- ------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ------------------------------------------------------------
-- 2. GRANT TYLER ADMIN ACCESS
-- ------------------------------------------------------------

update public.profiles
set role = 'admin'
where lower(email) = lower('tyler.m.emerick@gmail.com');

do $$
begin
  if not exists (
    select 1
    from public.profiles
    where lower(email) = lower('tyler.m.emerick@gmail.com')
  ) then
    raise exception 'No profile found for tyler.m.emerick@gmail.com. Sign up with that email first.';
  end if;
end $$;

-- ------------------------------------------------------------
-- 3. FOUNDER TROPHY
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

create table if not exists public.member_trophies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trophy_id uuid not null references public.trophy_definitions(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  featured_slot smallint check (featured_slot between 1 and 3),
  unique (user_id, trophy_id),
  unique (user_id, featured_slot)
);

insert into public.trophy_definitions (
  slug,
  name,
  description,
  icon,
  rarity,
  active
)
values (
  'founding-member',
  'Founding Member',
  'Founder of Strafe Crate and holder of the original founder profile title.',
  '◆',
  'legendary',
  true
)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  rarity = excluded.rarity,
  active = true;

-- Free featured slot 1 for Tyler, then feature Founder there.
update public.member_trophies mt
set featured_slot = null
from public.profiles p
where mt.user_id = p.id
  and lower(p.email) = lower('tyler.m.emerick@gmail.com')
  and mt.featured_slot = 1;

insert into public.member_trophies (
  user_id,
  trophy_id,
  featured_slot
)
select
  p.id,
  td.id,
  1
from public.profiles p
cross join public.trophy_definitions td
where lower(p.email) = lower('tyler.m.emerick@gmail.com')
  and td.slug = 'founding-member'
on conflict (user_id, trophy_id)
do update set featured_slot = 1;

alter table public.trophy_definitions enable row level security;
alter table public.member_trophies enable row level security;

drop policy if exists "Authenticated view trophy definitions"
on public.trophy_definitions;

create policy "Authenticated view trophy definitions"
on public.trophy_definitions
for select
to authenticated
using (active = true);

drop policy if exists "Members view own trophies"
on public.member_trophies;

create policy "Members view own trophies"
on public.member_trophies
for select
to authenticated
using (
  user_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Admins manage member trophies"
on public.member_trophies;

create policy "Admins manage member trophies"
on public.member_trophies
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant select on public.trophy_definitions, public.member_trophies
to authenticated;

grant insert, update, delete on public.member_trophies
to authenticated;

-- ------------------------------------------------------------
-- 4. REPORT STATUS + CHAT BANS
-- ------------------------------------------------------------

create table if not exists public.chat_reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.chat_messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default 'Member report',
  created_at timestamptz not null default now(),
  unique (message_id, reporter_id)
);

alter table public.chat_reports
  add column if not exists status text not null default 'open';

alter table public.chat_reports
  add column if not exists reviewed_by uuid references public.profiles(id);

alter table public.chat_reports
  add column if not exists reviewed_at timestamptz;

alter table public.chat_reports
  add column if not exists resolution text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.chat_reports'::regclass
      and conname = 'chat_reports_status_check'
  ) then
    alter table public.chat_reports
      add constraint chat_reports_status_check
      check (status in ('open','dismissed','actioned'));
  end if;
end $$;

create table if not exists public.chat_bans (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

alter table public.chat_bans
  add column if not exists created_by uuid references public.profiles(id);

create table if not exists public.moderation_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  message_id uuid references public.chat_messages(id) on delete set null,
  report_id uuid references public.chat_reports(id) on delete set null,
  action text not null,
  reason text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.chat_reports enable row level security;
alter table public.chat_bans enable row level security;
alter table public.moderation_log enable row level security;

drop policy if exists "Members submit chat reports"
on public.chat_reports;

create policy "Members submit chat reports"
on public.chat_reports
for insert
to authenticated
with check (reporter_id = auth.uid());

drop policy if exists "Members view own reports"
on public.chat_reports;

create policy "Members view own reports"
on public.chat_reports
for select
to authenticated
using (
  reporter_id = auth.uid()
  or public.is_admin()
);

drop policy if exists "Admins update reports"
on public.chat_reports;

create policy "Admins update reports"
on public.chat_reports
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins view chat bans"
on public.chat_bans;

create policy "Admins view chat bans"
on public.chat_bans
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins manage chat bans"
on public.chat_bans;

create policy "Admins manage chat bans"
on public.chat_bans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins view moderation log"
on public.moderation_log;

create policy "Admins view moderation log"
on public.moderation_log
for select
to authenticated
using (public.is_admin());

grant select, insert, update on public.chat_reports to authenticated;
grant select, insert, update, delete on public.chat_bans to authenticated;
grant select on public.moderation_log to authenticated;

-- ------------------------------------------------------------
-- 5. ENFORCE TIMEOUTS/BANS ON FUTURE CHAT POSTS
-- ------------------------------------------------------------

create or replace function public.enforce_chat_access()
returns trigger
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  active_ban public.chat_bans;
begin
  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'You may only post from your own account.';
  end if;

  select *
  into active_ban
  from public.chat_bans
  where user_id = new.user_id
    and (
      expires_at is null
      or expires_at > now()
    );

  if active_ban.user_id is not null then
    if active_ban.expires_at is null then
      raise exception 'You are permanently blocked from community chat.';
    else
      raise exception 'You are timed out from community chat until %.',
        active_ban.expires_at;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_chat_access_trigger
on public.chat_messages;

create trigger enforce_chat_access_trigger
before insert on public.chat_messages
for each row
execute function public.enforce_chat_access();

-- ------------------------------------------------------------
-- 6. ADMIN REPORT INBOX RPC
-- ------------------------------------------------------------

create or replace function public.get_admin_chat_reports()
returns table (
  report_id uuid,
  report_status text,
  report_reason text,
  reported_at timestamptz,
  message_id uuid,
  message_body text,
  message_created_at timestamptz,
  reported_user_id uuid,
  reported_display_name text,
  reporter_user_id uuid,
  reporter_display_name text,
  current_ban_expires_at timestamptz,
  permanently_banned boolean
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    cr.id,
    cr.status,
    cr.reason,
    cr.created_at,
    cm.id,
    cm.body,
    cm.created_at,
    cm.user_id,
    coalesce(
      nullif(trim(reported.display_name), ''),
      nullif(trim(reported.full_name), ''),
      'Member'
    ),
    cr.reporter_id,
    coalesce(
      nullif(trim(reporter.display_name), ''),
      nullif(trim(reporter.full_name), ''),
      'Member'
    ),
    cb.expires_at,
    (cb.user_id is not null and cb.expires_at is null)
  from public.chat_reports cr
  join public.chat_messages cm
    on cm.id = cr.message_id
  join public.profiles reported
    on reported.id = cm.user_id
  join public.profiles reporter
    on reporter.id = cr.reporter_id
  left join public.chat_bans cb
    on cb.user_id = cm.user_id
    and (
      cb.expires_at is null
      or cb.expires_at > now()
    )
  where public.is_admin()
  order by
    case when cr.status = 'open' then 0 else 1 end,
    cr.created_at desc;
$$;

revoke all on function public.get_admin_chat_reports()
from public, anon;

grant execute on function public.get_admin_chat_reports()
to authenticated;

-- ------------------------------------------------------------
-- 7. ADMIN MODERATION ACTION RPC
-- Valid actions:
-- dismiss, delete, timeout_1h, timeout_24h, timeout_7d,
-- permanent_ban, remove_ban
-- ------------------------------------------------------------

create or replace function public.moderate_chat_report(
  target_report_id uuid,
  moderation_action text,
  moderation_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  admin_user_id uuid := auth.uid();
  report_row public.chat_reports;
  message_row public.chat_messages;
  timeout_until timestamptz;
  resolution_text text;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  select *
  into report_row
  from public.chat_reports
  where id = target_report_id
  for update;

  if report_row.id is null then
    raise exception 'Report not found.';
  end if;

  select *
  into message_row
  from public.chat_messages
  where id = report_row.message_id;

  if message_row.id is null then
    raise exception 'Reported message not found.';
  end if;

  case moderation_action
    when 'dismiss' then
      resolution_text := 'Report dismissed';

    when 'delete' then
      update public.chat_messages
      set deleted_at = now()
      where id = message_row.id;

      resolution_text := 'Message deleted';

    when 'timeout_1h' then
      timeout_until := now() + interval '1 hour';

      insert into public.chat_bans (
        user_id,
        reason,
        expires_at,
        created_by
      )
      values (
        message_row.user_id,
        coalesce(moderation_reason, 'One-hour chat timeout'),
        timeout_until,
        admin_user_id
      )
      on conflict (user_id) do update set
        reason = excluded.reason,
        expires_at = excluded.expires_at,
        created_at = now(),
        created_by = excluded.created_by;

      resolution_text := 'User timed out for 1 hour';

    when 'timeout_24h' then
      timeout_until := now() + interval '24 hours';

      insert into public.chat_bans (
        user_id,
        reason,
        expires_at,
        created_by
      )
      values (
        message_row.user_id,
        coalesce(moderation_reason, 'Twenty-four-hour chat timeout'),
        timeout_until,
        admin_user_id
      )
      on conflict (user_id) do update set
        reason = excluded.reason,
        expires_at = excluded.expires_at,
        created_at = now(),
        created_by = excluded.created_by;

      resolution_text := 'User timed out for 24 hours';

    when 'timeout_7d' then
      timeout_until := now() + interval '7 days';

      insert into public.chat_bans (
        user_id,
        reason,
        expires_at,
        created_by
      )
      values (
        message_row.user_id,
        coalesce(moderation_reason, 'Seven-day chat timeout'),
        timeout_until,
        admin_user_id
      )
      on conflict (user_id) do update set
        reason = excluded.reason,
        expires_at = excluded.expires_at,
        created_at = now(),
        created_by = excluded.created_by;

      resolution_text := 'User timed out for 7 days';

    when 'permanent_ban' then
      insert into public.chat_bans (
        user_id,
        reason,
        expires_at,
        created_by
      )
      values (
        message_row.user_id,
        coalesce(moderation_reason, 'Permanent community chat ban'),
        null,
        admin_user_id
      )
      on conflict (user_id) do update set
        reason = excluded.reason,
        expires_at = null,
        created_at = now(),
        created_by = excluded.created_by;

      resolution_text := 'User permanently banned from chat';

    when 'remove_ban' then
      delete from public.chat_bans
      where user_id = message_row.user_id;

      resolution_text := 'Chat restriction removed';

    else
      raise exception 'Unknown moderation action.';
  end case;

  update public.chat_reports
  set
    status = case
      when moderation_action = 'dismiss' then 'dismissed'
      else 'actioned'
    end,
    reviewed_by = admin_user_id,
    reviewed_at = now(),
    resolution = resolution_text
  where id = target_report_id;

  insert into public.moderation_log (
    admin_id,
    target_user_id,
    message_id,
    report_id,
    action,
    reason,
    expires_at
  )
  values (
    admin_user_id,
    message_row.user_id,
    message_row.id,
    report_row.id,
    moderation_action,
    moderation_reason,
    timeout_until
  );

  return resolution_text;
end;
$$;

revoke all on function public.moderate_chat_report(uuid, text, text)
from public, anon;

grant execute
on function public.moderate_chat_report(uuid, text, text)
to authenticated;

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- 8. CONFIRM RESULTS
-- ------------------------------------------------------------

select
  email,
  role
from public.profiles
where lower(email) = lower('tyler.m.emerick@gmail.com');

select
  p.email,
  td.name as trophy,
  mt.featured_slot
from public.member_trophies mt
join public.profiles p on p.id = mt.user_id
join public.trophy_definitions td on td.id = mt.trophy_id
where lower(p.email) = lower('tyler.m.emerick@gmail.com')
  and td.slug = 'founding-member';
