-- Strafe Crate threaded support tickets
-- Run once in Supabase SQL Editor.

begin;

create extension if not exists pgcrypto;

-- Add archive support to the existing status check.
alter table public.support_tickets
  drop constraint if exists support_tickets_status_check;

alter table public.support_tickets
  add constraint support_tickets_status_check
  check (status in (
    'open',
    'in_progress',
    'waiting_on_member',
    'resolved',
    'closed',
    'archived'
  ));

alter table public.support_tickets
  add column if not exists closed_at timestamptz;

alter table public.support_tickets
  add column if not exists archived_at timestamptz;

alter table public.support_tickets
  add column if not exists locked boolean not null default false;

-- Preserve history, but permit only one active ticket per member.
drop index if exists support_tickets_one_active_per_user_idx;

create unique index support_tickets_one_active_per_user_idx
on public.support_tickets(user_id)
where status in ('open','in_progress','waiting_on_member');

-- Threaded messages.
create table if not exists public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_role text not null check (author_role in ('member','admin','system')),
  body text not null check (char_length(trim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index if not exists support_ticket_messages_ticket_created_idx
  on public.support_ticket_messages(ticket_id, created_at asc);

alter table public.support_ticket_messages enable row level security;

-- Admin-controlled support access restriction.
create table if not exists public.support_ticket_restrictions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  disabled boolean not null default true,
  reason text,
  disabled_by uuid references public.profiles(id) on delete set null,
  disabled_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.support_ticket_restrictions enable row level security;

grant usage on schema public to authenticated;
grant select on public.support_tickets to authenticated;
grant select on public.support_ticket_messages to authenticated;
grant select on public.support_ticket_restrictions to authenticated;

-- Ticket table policies.
drop policy if exists "Members read own support tickets"
on public.support_tickets;
create policy "Members read own support tickets"
on public.support_tickets
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins update support tickets"
on public.support_tickets;
create policy "Admins update support tickets"
on public.support_tickets
for update to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins delete support tickets"
on public.support_tickets;
create policy "Admins delete support tickets"
on public.support_tickets
for delete to authenticated
using (public.is_admin());

-- Thread policies.
drop policy if exists "Members read own ticket messages"
on public.support_ticket_messages;
create policy "Members read own ticket messages"
on public.support_ticket_messages
for select to authenticated
using (
  public.is_admin()
  or exists (
    select 1
    from public.support_tickets t
    where t.id = ticket_id
      and t.user_id = auth.uid()
  )
);

drop policy if exists "Admins manage ticket messages"
on public.support_ticket_messages;
create policy "Admins manage ticket messages"
on public.support_ticket_messages
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members see own ticket restriction"
on public.support_ticket_restrictions;
create policy "Members see own ticket restriction"
on public.support_ticket_restrictions
for select to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Admins manage ticket restrictions"
on public.support_ticket_restrictions;
create policy "Admins manage ticket restrictions"
on public.support_ticket_restrictions
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Create one active ticket and seed the first thread message.
create or replace function public.create_support_ticket(
  ticket_category text,
  ticket_subject text,
  ticket_message text,
  ticket_priority text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  ticket_id uuid;
  ticket_disabled boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select coalesce(r.disabled, false)
  into ticket_disabled
  from public.support_ticket_restrictions r
  where r.user_id = current_user_id;

  if coalesce(ticket_disabled, false) then
    raise exception 'Support ticket access is disabled for this account. Contact strafecrate@gmail.com.';
  end if;

  if exists (
    select 1
    from public.support_tickets t
    where t.user_id = current_user_id
      and t.status in ('open','in_progress','waiting_on_member')
  ) then
    raise exception 'You already have an active support ticket. Open it to add more information.';
  end if;

  if ticket_category not in (
    'billing','subscription','fulfillment','steam_trade','upgrade',
    'rewards','community','account','privacy','technical','other'
  ) then
    raise exception 'Choose a valid issue type.';
  end if;

  if ticket_priority not in ('low','normal','high') then
    raise exception 'Choose a valid priority.';
  end if;

  if char_length(trim(coalesce(ticket_subject,''))) < 3 then
    raise exception 'Add a short ticket subject.';
  end if;

  if char_length(trim(coalesce(ticket_message,''))) < 3 then
    raise exception 'Describe what happened.';
  end if;

  insert into public.support_tickets(
    user_id,
    category,
    subject,
    message,
    priority,
    status,
    updated_at
  )
  values (
    current_user_id,
    ticket_category,
    trim(ticket_subject),
    trim(ticket_message),
    ticket_priority,
    'open',
    now()
  )
  returning id into ticket_id;

  insert into public.support_ticket_messages(
    ticket_id,
    author_id,
    author_role,
    body
  )
  values (
    ticket_id,
    current_user_id,
    'member',
    trim(ticket_message)
  );

  return ticket_id;
end;
$$;

revoke all on function public.create_support_ticket(text,text,text,text)
from public, anon;
grant execute on function public.create_support_ticket(text,text,text,text)
to authenticated;

-- Member adds to their current thread.
create or replace function public.add_support_ticket_message(
  target_ticket_id uuid,
  message_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  message_id uuid;
  ticket_status text;
  ticket_locked boolean;
  ticket_owner uuid;
  ticket_disabled boolean;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select coalesce(r.disabled, false)
  into ticket_disabled
  from public.support_ticket_restrictions r
  where r.user_id = current_user_id;

  if coalesce(ticket_disabled, false) then
    raise exception 'Support ticket access is disabled for this account.';
  end if;

  select t.user_id, t.status, t.locked
  into ticket_owner, ticket_status, ticket_locked
  from public.support_tickets t
  where t.id = target_ticket_id;

  if ticket_owner is distinct from current_user_id then
    raise exception 'Ticket not found.';
  end if;

  if ticket_status not in ('open','in_progress','waiting_on_member')
     or coalesce(ticket_locked, false) then
    raise exception 'This ticket is closed or archived and cannot receive new replies.';
  end if;

  if char_length(trim(coalesce(message_body,''))) < 1 then
    raise exception 'Write a message before sending.';
  end if;

  insert into public.support_ticket_messages(
    ticket_id,
    author_id,
    author_role,
    body
  )
  values (
    target_ticket_id,
    current_user_id,
    'member',
    trim(message_body)
  )
  returning id into message_id;

  update public.support_tickets
  set
    status = case
      when status = 'waiting_on_member' then 'in_progress'
      else status
    end,
    updated_at = now()
  where id = target_ticket_id;

  return message_id;
end;
$$;

revoke all on function public.add_support_ticket_message(uuid,text)
from public, anon;
grant execute on function public.add_support_ticket_message(uuid,text)
to authenticated;

-- Admin reply in the same thread.
create or replace function public.admin_reply_support_ticket(
  target_ticket_id uuid,
  response_body text,
  next_status text default 'in_progress'
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_admin_id uuid := auth.uid();
  message_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  if next_status not in (
    'open','in_progress','waiting_on_member','resolved','closed','archived'
  ) then
    raise exception 'Invalid ticket status.';
  end if;

  if char_length(trim(coalesce(response_body,''))) < 1 then
    raise exception 'Write a response before sending.';
  end if;

  insert into public.support_ticket_messages(
    ticket_id,
    author_id,
    author_role,
    body
  )
  values (
    target_ticket_id,
    current_admin_id,
    'admin',
    trim(response_body)
  )
  returning id into message_id;

  update public.support_tickets
  set
    admin_response = trim(response_body),
    status = next_status,
    locked = next_status in ('closed','archived'),
    closed_at = case when next_status = 'closed' then now() else closed_at end,
    archived_at = case when next_status = 'archived' then now() else archived_at end,
    resolved_at = case when next_status = 'resolved' then now() else resolved_at end,
    assigned_admin_id = current_admin_id,
    updated_at = now()
  where id = target_ticket_id;

  return message_id;
end;
$$;

revoke all on function public.admin_reply_support_ticket(uuid,text,text)
from public, anon;
grant execute on function public.admin_reply_support_ticket(uuid,text,text)
to authenticated;

-- Admin can change status without writing a reply.
create or replace function public.admin_set_support_ticket_status(
  target_ticket_id uuid,
  next_status text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  if next_status not in (
    'open','in_progress','waiting_on_member','resolved','closed','archived'
  ) then
    raise exception 'Invalid ticket status.';
  end if;

  update public.support_tickets
  set
    status = next_status,
    locked = next_status in ('closed','archived'),
    closed_at = case when next_status = 'closed' then now() else closed_at end,
    archived_at = case when next_status = 'archived' then now() else archived_at end,
    resolved_at = case when next_status = 'resolved' then now() else resolved_at end,
    updated_at = now(),
    assigned_admin_id = coalesce(assigned_admin_id, auth.uid())
  where id = target_ticket_id;
end;
$$;

revoke all on function public.admin_set_support_ticket_status(uuid,text)
from public, anon;
grant execute on function public.admin_set_support_ticket_status(uuid,text)
to authenticated;

-- Admin disables or restores support ticket access.
create or replace function public.admin_set_ticket_access(
  target_user_id uuid,
  should_disable boolean,
  restriction_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin permission required.';
  end if;

  if should_disable then
    insert into public.support_ticket_restrictions(
      user_id,
      disabled,
      reason,
      disabled_by,
      disabled_at,
      updated_at
    )
    values (
      target_user_id,
      true,
      nullif(trim(restriction_reason),''),
      auth.uid(),
      now(),
      now()
    )
    on conflict (user_id) do update set
      disabled = true,
      reason = excluded.reason,
      disabled_by = auth.uid(),
      disabled_at = now(),
      updated_at = now();
  else
    delete from public.support_ticket_restrictions
    where user_id = target_user_id;
  end if;
end;
$$;

revoke all on function public.admin_set_ticket_access(uuid,boolean,text)
from public, anon;
grant execute on function public.admin_set_ticket_access(uuid,boolean,text)
to authenticated;

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.support_ticket_messages') is not null
    as ticket_messages_ready,
  to_regclass('public.support_ticket_restrictions') is not null
    as ticket_restrictions_ready,
  to_regprocedure('public.create_support_ticket(text,text,text,text)') is not null
    as create_ticket_ready,
  to_regprocedure('public.add_support_ticket_message(uuid,text)') is not null
    as member_reply_ready;
