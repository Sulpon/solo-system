-- Atlas background notifications.
--
-- Run this in the Supabase SQL editor. Safe to re-run.
--
-- WHY THESE TWO TABLES
--
-- A notification that fires while Atlas is closed cannot be scheduled by
-- Atlas: the page is not running, and a browser timer dies with the tab.
-- Something outside the device has to hold the alarm clock. These tables
-- are that clock.
--
--   push_subscriptions     where to deliver (one row per browser/device)
--   scheduled_notifications what to deliver, and when
--
-- Recurrence is deliberately NOT modelled here. The client resolves
-- cadence/scheduledDays into absolute timestamps (see
-- _lib/engines/reminder-engine.ts) and uploads those, so this schema never
-- has to understand a quest. It only asks "is send_at in the past".

-- ---------------------------------------------------------------------
-- Where to deliver
-- ---------------------------------------------------------------------

create table if not exists public.push_subscriptions (
  -- The endpoint IS the identity of a subscription, as far as the push
  -- service is concerned, so it is the primary key: re-subscribing the
  -- same browser updates the row instead of accumulating dead ones.
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  -- Purely diagnostic: which device a subscription belongs to, so a user
  -- can recognise it in a list.
  user_agent text,
  created_at timestamptz not null default now(),
  -- Set when the push service reports the subscription is gone (HTTP 404
  -- or 410). Kept rather than deleted so a device that comes back can be
  -- told apart from one that never existed.
  expired_at timestamptz
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id)
  where expired_at is null;

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users read own push subscriptions" on public.push_subscriptions;
create policy "Users read own push subscriptions"
  on public.push_subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Users insert own push subscriptions" on public.push_subscriptions;
create policy "Users insert own push subscriptions"
  on public.push_subscriptions for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own push subscriptions" on public.push_subscriptions;
create policy "Users update own push subscriptions"
  on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own push subscriptions" on public.push_subscriptions;
create policy "Users delete own push subscriptions"
  on public.push_subscriptions for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- What to deliver, and when
-- ---------------------------------------------------------------------

create table if not exists public.scheduled_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Stable per (quest, day, time) - see buildReminderDedupeKey. The unique
  -- constraint with user_id is what makes re-uploading a schedule an
  -- update rather than a duplicate.
  dedupe_key text not null,
  quest_id text not null,
  title text not null,
  body text not null default '',
  url text not null default '/',
  send_at timestamptz not null,
  sent_at timestamptz,
  -- Why a send failed, when it did. Null while pending or on success.
  last_error text,
  created_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);

-- The sender's only query: pending rows whose time has come.
create index if not exists scheduled_notifications_due_idx
  on public.scheduled_notifications (send_at)
  where sent_at is null;

alter table public.scheduled_notifications enable row level security;

drop policy if exists "Users read own scheduled notifications" on public.scheduled_notifications;
create policy "Users read own scheduled notifications"
  on public.scheduled_notifications for select using (auth.uid() = user_id);

drop policy if exists "Users insert own scheduled notifications" on public.scheduled_notifications;
create policy "Users insert own scheduled notifications"
  on public.scheduled_notifications for insert with check (auth.uid() = user_id);

drop policy if exists "Users update own scheduled notifications" on public.scheduled_notifications;
create policy "Users update own scheduled notifications"
  on public.scheduled_notifications for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users delete own scheduled notifications" on public.scheduled_notifications;
create policy "Users delete own scheduled notifications"
  on public.scheduled_notifications for delete using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- Housekeeping
-- ---------------------------------------------------------------------
--
-- Sent rows are kept briefly so a client can tell "already delivered" from
-- "never existed", then dropped - this table is a queue, not a history.
create or replace function public.purge_old_scheduled_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.scheduled_notifications
  where sent_at is not null and sent_at < now() - interval '7 days';
$$;
