-- Atlas cloud sync: one JSON snapshot per user.
-- Run this in the Supabase SQL editor (or via `supabase db push` if you adopt the CLI).

create table if not exists public.user_atlas_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_atlas_data enable row level security;

drop policy if exists "Users can select own atlas data" on public.user_atlas_data;
create policy "Users can select own atlas data"
  on public.user_atlas_data
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own atlas data" on public.user_atlas_data;
create policy "Users can insert own atlas data"
  on public.user_atlas_data
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own atlas data" on public.user_atlas_data;
create policy "Users can update own atlas data"
  on public.user_atlas_data
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own atlas data" on public.user_atlas_data;
create policy "Users can delete own atlas data"
  on public.user_atlas_data
  for delete
  using (auth.uid() = user_id);
