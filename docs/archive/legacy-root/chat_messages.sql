-- Strafe Crate Community Chat
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null check (char_length(message) <= 300),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

drop policy if exists "Anyone can read chat" on public.chat_messages;
create policy "Anyone can read chat"
on public.chat_messages
for select
using (true);

drop policy if exists "Authenticated users can post chat" on public.chat_messages;
create policy "Authenticated users can post chat"
on public.chat_messages
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chat" on public.chat_messages;
create policy "Users can delete own chat"
on public.chat_messages
for delete
to authenticated
using (auth.uid() = user_id);

NOTIFY pgrst, 'reload schema';
