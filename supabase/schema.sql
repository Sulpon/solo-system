-- Atlas cloud sync: one JSON snapshot per user.
-- Run this in the Supabase SQL editor (or via `supabase db push` if you adopt the CLI).

create table if not exists public.user_atlas_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Milestone 4 (Cross-Client Cloud Sync): additive, safe to re-run.
--
-- version: optimistic-concurrency counter for the `data` snapshot. A client
-- pushes with the version it last read; if another client already bumped it
-- since, the push is rejected (0 rows updated) and the pushing client must
-- pull + merge (see mergeAtlasSnapshots in _lib/sync/) before retrying -
-- this is what turns "last snapshot wins" into a real, deterministic
-- conflict-detection strategy without a full per-entity event log.
--
-- active_focus_session: the CURRENT active Focus Session (or null), synced
-- on its own separate, low-frequency channel (see _lib/sync/
-- active-focus-sync.ts) so two clients can never silently run two different
-- sessions at once - deliberately NOT part of the `data` snapshot, for the
-- same reason FOCUS_ACTIVE_SESSION_KEY isn't a "menace-*" key: an
-- in-progress session must never be clobbered by a stale snapshot pull.
alter table public.user_atlas_data add column if not exists version integer not null default 1;
alter table public.user_atlas_data add column if not exists active_focus_session jsonb;

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
