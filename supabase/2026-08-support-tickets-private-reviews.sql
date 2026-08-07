-- Strafe Crate Support Tickets + Private Reviews
-- Run once in Supabase SQL Editor after deploying the matching repository.

begin;

create extension if not exists pgcrypto;

-- ============================================================
-- SUPPORT TICKETS
-- ============================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  category text not null check (
    category in (
      'billing','subscription','fulfillment','steam_trade','upgrade',
      'rewards','community','account','privacy','technical','other'
    )
  ),
  subject text not null check (char_length(subject) between 3 and 120),
  message text not null check (char_length(message) between 3 and 5000),
  priority text not null default 'normal'
    check (priority in ('low','normal','high')),
  status text not null default 'open'
    check (status in ('open','in_progress','waiting_on_member','resolved','closed')),
  admin_response text,
  assigned_admin_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint support_tickets_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade,
  constraint support_tickets_assigned_admin_id_fkey
    foreign key (assigned_admin_id) references public.profiles(id) on delete set null
);

create index if not exists support_tickets_user_created_idx
  on public.support_tickets(user_id, created_at desc);

create index if not exists support_tickets_status_created_idx
  on public.support_tickets(status, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "Members create own support tickets"
on public.support_tickets;
create policy "Members create own support tickets"
on public.support_tickets
for insert to authenticated
with check (user_id = auth.uid());

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

-- Automatically attach the authenticated user even if the client omits user_id.
create or replace function public.attach_support_ticket_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required.';
  end if;

  new.user_id := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists attach_support_ticket_user_trigger
on public.support_tickets;

create trigger attach_support_ticket_user_trigger
before insert on public.support_tickets
for each row execute function public.attach_support_ticket_user();

create or replace function public.touch_support_ticket()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();

  if new.status in ('resolved','closed') and new.resolved_at is null then
    new.resolved_at := now();
  elsif new.status not in ('resolved','closed') then
    new.resolved_at := null;
  end if;

  if public.is_admin() then
    new.assigned_admin_id := coalesce(new.assigned_admin_id, auth.uid());
  end if;

  return new;
end;
$$;

drop trigger if exists touch_support_ticket_trigger
on public.support_tickets;

create trigger touch_support_ticket_trigger
before update on public.support_tickets
for each row execute function public.touch_support_ticket();

-- ============================================================
-- PRIVATE REVIEWS
-- ============================================================

create table if not exists public.private_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 3 and 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint private_reviews_user_id_fkey
    foreign key (user_id) references public.profiles(id) on delete cascade
);

create index if not exists private_reviews_updated_idx
  on public.private_reviews(updated_at desc);

alter table public.private_reviews enable row level security;

-- Reviews are intentionally not readable by other members.
drop policy if exists "Admins read private reviews"
on public.private_reviews;
create policy "Admins read private reviews"
on public.private_reviews
for select to authenticated
using (public.is_admin());

drop policy if exists "Admins delete private reviews"
on public.private_reviews;
create policy "Admins delete private reviews"
on public.private_reviews
for delete to authenticated
using (public.is_admin());

create or replace function public.submit_private_review(
  review_rating integer,
  review_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  current_user_id uuid := auth.uid();
  review_id uuid;
begin
  if current_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if review_rating < 1 or review_rating > 5 then
    raise exception 'Choose a rating from 1 to 5 stars.';
  end if;

  if char_length(trim(coalesce(review_body,''))) < 3 then
    raise exception 'Please include a short written review.';
  end if;

  insert into public.private_reviews(user_id, rating, body)
  values (current_user_id, review_rating, trim(review_body))
  on conflict (user_id) do update set
    rating = excluded.rating,
    body = excluded.body,
    updated_at = now()
  returning id into review_id;

  return review_id;
end;
$$;

revoke all on function public.submit_private_review(integer,text)
from public, anon;

grant execute on function public.submit_private_review(integer,text)
to authenticated;

notify pgrst, 'reload schema';

commit;

select
  to_regclass('public.support_tickets') is not null as support_tickets_ready,
  to_regclass('public.private_reviews') is not null as private_reviews_ready,
  to_regprocedure('public.submit_private_review(integer,text)') is not null
    as private_review_function_ready;
