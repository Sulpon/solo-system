import type { SupabaseClient } from "@supabase/supabase-js";
import { FOCUS_ACTIVE_SESSION_KEY, MENACE_STORAGE_EVENT } from "../storage-keys";
import type { FocusSession } from "../types/focus";

const ATLAS_TABLE = "user_atlas_data";

// A deliberately SEPARATE, small channel from the big debounced menace-*
// snapshot sync (see cloud-sync-store.tsx) - the active Focus Session lives
// under atlas-focus-active-session specifically BECAUSE it's excluded from
// that snapshot sweep (see storage-keys.ts's comment on
// FOCUS_ACTIVE_SESSION_KEY: an in-progress session must never be silently
// clobbered by another device's full-snapshot pull). This module exists so
// Milestone 4 section 8's requirement - "Focus sessions cannot silently
// duplicate across clients" - can be satisfied WITHOUT folding the active
// session into that snapshot sweep, i.e. without touching focus-store.tsx's
// timestamp-derived timer logic at all. It only ever pushes on real
// transitions (start/pause/resume/finish - see cloud-sync-store.tsx's
// key-scoped storage listener), never on a per-tick timer.
export function readLocalActiveFocusSession(): FocusSession | null {
  const raw = window.localStorage.getItem(FOCUS_ACTIVE_SESSION_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as FocusSession;
  } catch {
    return null;
  }
}

// Writes directly to localStorage + fires the same event
// useLocalStorageState's own setter would - mirrors that hook's internal
// contract (see use-local-storage-state.ts) without importing a React hook
// into this non-React module. Never routes through finishSession(): a
// session invalidated here by a cross-device conflict never happened from
// this client's point of view, so it must not award XP/Coins or create a
// Focus history entry.
function writeLocalActiveFocusSession(session: FocusSession | null) {
  if (session) {
    window.localStorage.setItem(FOCUS_ACTIVE_SESSION_KEY, JSON.stringify(session));
  } else {
    window.localStorage.removeItem(FOCUS_ACTIVE_SESSION_KEY);
  }

  window.dispatchEvent(new CustomEvent(MENACE_STORAGE_EVENT, { detail: { key: FOCUS_ACTIVE_SESSION_KEY } }));
}

export async function pushActiveFocusSession(supabase: SupabaseClient, userId: string, session: FocusSession | null): Promise<void> {
  await supabase.from(ATLAS_TABLE).upsert({ user_id: userId, active_focus_session: session }, { onConflict: "user_id" });
}

async function pullRemoteActiveFocusSession(supabase: SupabaseClient, userId: string): Promise<FocusSession | null> {
  const { data, error } = await supabase.from(ATLAS_TABLE).select("active_focus_session").eq("user_id", userId).maybeSingle();

  if (error || !data) {
    return null;
  }

  return (data.active_focus_session as FocusSession | null) ?? null;
}

// Called at three points (see cloud-sync-store.tsx): right after sign-in/
// hydration, on a light visibility-change check, and explicitly before
// QuestExecutionControl starts a new session - so the existing local
// "another session is already active" check (isAnotherSessionActive) is
// evaluated against genuinely up-to-date state instead of only this
// client's own history.
export async function reconcileActiveFocusSession(supabase: SupabaseClient, userId: string): Promise<void> {
  const remote = await pullRemoteActiveFocusSession(supabase, userId);
  const local = readLocalActiveFocusSession();

  if (!remote && !local) {
    return;
  }

  if (remote && !local) {
    // Another client's session - adopt it so THIS client also shows Quest A
    // as active, timer included (FocusSession carries startedAt/pausedAt/
    // totalPausedMs, so the existing timestamp-derived timer math in
    // focus-store.tsx computes the identical elapsed time with no changes).
    writeLocalActiveFocusSession(remote);
    return;
  }

  if (!remote && local) {
    // Cloud doesn't know about this client's session yet - inform it so a
    // second client can see it as active too.
    await pushActiveFocusSession(supabase, userId, local);
    return;
  }

  if (remote && local && remote.id === local.id) {
    // Same session, already known to both sides - live cross-device pause/
    // resume mirroring is out of scope for this milestone (see the
    // Milestone 4 report's Known Limitations); nothing to reconcile here.
    return;
  }

  if (remote && local && remote.id !== local.id) {
    // Genuine race: two different sessions started on two clients before
    // either learned about the other. Deterministic, documented resolution -
    // whichever started first wins; the other is discarded locally with no
    // XP/Coins/history side effects, exactly as if it never started.
    const remoteStartedFirst = remote.startedAt <= local.startedAt;

    if (remoteStartedFirst) {
      writeLocalActiveFocusSession(remote);
    } else {
      await pushActiveFocusSession(supabase, userId, local);
    }
  }
}
