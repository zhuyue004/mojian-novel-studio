-- Run once in Supabase Dashboard → SQL Editor.
create table if not exists public.novel_app_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.novel_app_state enable row level security;

create policy "Users can read their own novel state"
on public.novel_app_state for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own novel state"
on public.novel_app_state for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own novel state"
on public.novel_app_state for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
