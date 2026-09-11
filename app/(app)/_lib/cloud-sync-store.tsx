"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { applyAtlasSnapshot, collectAtlasSnapshot, hasAnyAtlasData, type AtlasSnapshot } from "./atlas-snapshot";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import { FOCUS_ACTIVE_SESSION_KEY, MENACE_STORAGE_EVENT } from "./storage-keys";
import { mergeAtlasSnapshots } from "./sync/merge-atlas-snapshot";
import { pushActiveFocusSession, readLocalActiveFocusSession, reconcileActiveFocusSession as reconcileActiveFocusSessionRemote } from "./sync/active-focus-sync";

const ATLAS_TABLE = "user_atlas_data";
const SYNC_DEBOUNCE_MS = 800;

// "offline" is distinct from "error": offline means "no network reached the
// server at all" (nothing wrong with the data, will resolve itself the
// moment connectivity returns - see the "online" listener below), while
// "error" means the server was reached and rejected the request (RLS,
// malformed data, etc), which genuinely needs surfacing.
export type CloudSyncStatus = "idle" | "syncing" | "synced" | "offline" | "error";

export type CloudSyncStoreValue = Readonly<{
  isCloudSyncAvailable: boolean;
  isAuthLoading: boolean;
  user: User | null;
  syncStatus: CloudSyncStatus;
  syncError: string | null;
  lastSyncedAt: string | null;
  showUploadPrompt: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  confirmUploadLocalSnapshot: () => Promise<void>;
  dismissUploadPrompt: () => void;
  syncNow: () => Promise<void>;
  // Exposed so QuestExecutionControl can pull the latest cross-device Focus
  // Session state immediately before deciding whether starting a new one
  // would conflict - see _lib/sync/active-focus-sync.ts. A safe no-op when
  // cloud sync isn't configured or no one is signed in.
  reconcileActiveFocusSession: () => Promise<void>;
}>;

export const CloudSyncContext = createContext<CloudSyncStoreValue | null>(null);

function isLikelyOffline(error: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }

  // Supabase/fetch surface a plain TypeError ("Failed to fetch" / "NetworkError...")
  // for a request that never reached the server - anything more specific
  // (RLS, constraint, malformed payload) comes back as a structured
  // PostgrestError instead, which this intentionally does NOT match.
  return error instanceof TypeError;
}

export function CloudSyncProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const cloudSyncAvailable = isSupabaseConfigured();

  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(cloudSyncAvailable);
  const [showUploadPrompt, setShowUploadPrompt] = useState(false);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const userIdRef = useRef<string | null>(null);
  const isApplyingRemoteRef = useRef(false);
  const debounceTimerRef = useRef<number | null>(null);
  // The last version this client is known to have written or read - the
  // optimistic-concurrency token for pushSnapshot's compare-and-swap update.
  // null means "never synced this session" (first push must INSERT).
  const knownVersionRef = useRef<number | null>(null);
  const hasPendingChangesRef = useRef(false);

  const pushSnapshot = useCallback(async (userId: string): Promise<void> => {
    if (!cloudSyncAvailable) {
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    const supabase = getSupabaseBrowserClient();
    const snapshot = collectAtlasSnapshot();
    const nowIso = new Date().toISOString();

    try {
      if (knownVersionRef.current === null) {
        const { error } = await supabase.from(ATLAS_TABLE).insert({ user_id: userId, data: snapshot, version: 1, updated_at: nowIso });

        if (!error) {
          knownVersionRef.current = 1;
          hasPendingChangesRef.current = false;
          setSyncStatus("synced");
          setLastSyncedAt(nowIso);
          return;
        }
        // Row already exists (another client created it first, or this is a
        // reconnect after a dropped first push) - fall through to the
        // conflict-safe compare-and-swap path below instead of failing.
      } else {
        const expectedVersion = knownVersionRef.current;
        const { data, error } = await supabase
          .from(ATLAS_TABLE)
          .update({ data: snapshot, updated_at: nowIso, version: expectedVersion + 1 })
          .eq("user_id", userId)
          .eq("version", expectedVersion)
          .select("version");

        if (!error && data && data.length > 0) {
          knownVersionRef.current = expectedVersion + 1;
          hasPendingChangesRef.current = false;
          setSyncStatus("synced");
          setLastSyncedAt(nowIso);
          return;
        }

        if (error && isLikelyOffline(error)) {
          setSyncStatus("offline");
          return;
        }
        // error, or 0 rows matched (another client's push already moved the
        // version past what we expected) - either way, fall through to the
        // pull-merge-retry path below rather than reporting a hard failure.
      }

      // Conflict path: another client committed a newer version since we
      // last knew about it (or this is our very first push and someone beat
      // us to creating the row). Pull the current cloud state, merge it with
      // what we were about to push (see mergeAtlasSnapshots - collection
      // keys merge per-entity by id, e.g. Quest A + Quest B both survive),
      // apply the merged result locally too, then retry the push once
      // against the version we just observed.
      const { data: remoteRow, error: pullError } = await supabase.from(ATLAS_TABLE).select("data, version").eq("user_id", userId).maybeSingle();

      if (pullError || !remoteRow) {
        setSyncStatus(pullError && isLikelyOffline(pullError) ? "offline" : "error");
        setSyncError(pullError?.message ?? null);
        return;
      }

      const merged = mergeAtlasSnapshots(snapshot, remoteRow.data as AtlasSnapshot);
      isApplyingRemoteRef.current = true;
      applyAtlasSnapshot(merged);
      isApplyingRemoteRef.current = false;

      const remoteVersion = remoteRow.version as number;
      const { error: retryError } = await supabase
        .from(ATLAS_TABLE)
        .update({ data: merged, updated_at: nowIso, version: remoteVersion + 1 })
        .eq("user_id", userId)
        .eq("version", remoteVersion);

      if (retryError) {
        setSyncStatus(isLikelyOffline(retryError) ? "offline" : "error");
        setSyncError(retryError.message);
        return;
      }

      knownVersionRef.current = remoteVersion + 1;
      hasPendingChangesRef.current = false;
      setSyncStatus("synced");
      setLastSyncedAt(nowIso);
    } catch (thrown) {
      setSyncStatus(isLikelyOffline(thrown) ? "offline" : "error");
      setSyncError(thrown instanceof Error ? thrown.message : "Unknown sync error");
    }
  }, [cloudSyncAvailable]);

  const scheduleSync = useCallback(
    (userId: string) => {
      hasPendingChangesRef.current = true;

      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = window.setTimeout(() => {
        void pushSnapshot(userId);
      }, SYNC_DEBOUNCE_MS);
    },
    [pushSnapshot],
  );

  const hydrateFromCloud = useCallback(async (userId: string) => {
    if (!cloudSyncAvailable) {
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    const supabase = getSupabaseBrowserClient();

    try {
      const { data, error } = await supabase.from(ATLAS_TABLE).select("data, version, updated_at").eq("user_id", userId).maybeSingle();

      if (error) {
        setSyncStatus(isLikelyOffline(error) ? "offline" : "error");
        setSyncError(error.message);
        return;
      }

      if (!data) {
        knownVersionRef.current = null;
        setSyncStatus("idle");

        if (hasAnyAtlasData()) {
          setShowUploadPrompt(true);
        }
        return;
      }

      knownVersionRef.current = data.version as number;
      const remoteSnapshot = data.data as AtlasSnapshot;

      if (hasAnyAtlasData()) {
        // Both sides have real state - this is the "Desktop contains
        // locally created data AND Cloud contains existing data" case from
        // the Milestone 4 spec: never blindly overwrite either. Merge, apply
        // the merged result locally, then push it back as the new
        // authoritative version so the cloud reflects the merge too.
        const merged = mergeAtlasSnapshots(collectAtlasSnapshot(), remoteSnapshot);
        isApplyingRemoteRef.current = true;
        applyAtlasSnapshot(merged);
        isApplyingRemoteRef.current = false;

        const nowIso = new Date().toISOString();
        const { error: pushError } = await supabase
          .from(ATLAS_TABLE)
          .update({ data: merged, updated_at: nowIso, version: (data.version as number) + 1 })
          .eq("user_id", userId)
          .eq("version", data.version);

        if (!pushError) {
          knownVersionRef.current = (data.version as number) + 1;
        }
        // A failed push-back here isn't fatal - the merged state is already
        // applied locally, and the next local change's debounced sync (or a
        // manual Sync Now) will push it.

        setSyncStatus("synced");
        setLastSyncedAt(nowIso);
        return;
      }

      // Nothing to lose locally - safe to adopt the cloud snapshot wholesale.
      isApplyingRemoteRef.current = true;
      applyAtlasSnapshot(remoteSnapshot);
      isApplyingRemoteRef.current = false;
      setSyncStatus("synced");
      setLastSyncedAt((data.updated_at as string | null) ?? new Date().toISOString());
    } catch (thrown) {
      setSyncStatus(isLikelyOffline(thrown) ? "offline" : "error");
      setSyncError(thrown instanceof Error ? thrown.message : "Unknown sync error");
    }
  }, [cloudSyncAvailable]);

  const reconcileActiveFocusSession = useCallback(async () => {
    const userId = userIdRef.current;

    if (!cloudSyncAvailable || !userId) {
      return;
    }

    try {
      await reconcileActiveFocusSessionRemote(getSupabaseBrowserClient(), userId);
    } catch {
      // Best-effort - offline or a transient error here just means the
      // existing LOCAL "another session is already active" check (see
      // QuestExecutionControl.tsx) runs against whatever it already knew,
      // same as before this milestone.
    }
  }, [cloudSyncAvailable]);

  useEffect(() => {
    if (!cloudSyncAvailable) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    let isActive = true;

    function handleUser(nextUser: User | null) {
      const previousUserId = userIdRef.current;
      userIdRef.current = nextUser?.id ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setShowUploadPrompt(false);
        setSyncStatus("idle");
        setLastSyncedAt(null);
        knownVersionRef.current = null;
        return;
      }

      if (nextUser.id !== previousUserId) {
        void hydrateFromCloud(nextUser.id).then(() => void reconcileActiveFocusSession());
      }
    }

    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      if (!isActive) {
        return;
      }

      handleUser(data.session?.user ?? null);
      setIsAuthLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      handleUser(session?.user ?? null);
      setIsAuthLoading(false);
    });

    return () => {
      isActive = false;
      subscription.subscription.unsubscribe();
    };
  }, [cloudSyncAvailable, hydrateFromCloud, reconcileActiveFocusSession]);

  useEffect(() => {
    if (!cloudSyncAvailable) {
      return;
    }

    function handleLocalChange(event: Event) {
      if (isApplyingRemoteRef.current) {
        return;
      }

      const userId = userIdRef.current;

      if (!userId) {
        return;
      }

      const changedKey = event instanceof StorageEvent ? event.key : (event as CustomEvent<{ key?: string }>).detail?.key;

      if (changedKey === FOCUS_ACTIVE_SESSION_KEY) {
        // Its own small, immediate channel - see active-focus-sync.ts. Not
        // debounced with the big snapshot (infrequent, user-initiated
        // start/pause/resume/finish transitions only, never a timer tick),
        // and not part of the snapshot itself.
        void pushActiveFocusSession(getSupabaseBrowserClient(), userId, readLocalActiveFocusSession());
        return;
      }

      scheduleSync(userId);
    }

    window.addEventListener(MENACE_STORAGE_EVENT, handleLocalChange);
    window.addEventListener("storage", handleLocalChange);

    return () => {
      window.removeEventListener(MENACE_STORAGE_EVENT, handleLocalChange);
      window.removeEventListener("storage", handleLocalChange);
    };
  }, [cloudSyncAvailable, scheduleSync]);

  // Reconnect handling (spec section 4/13.5): a debounced push that failed
  // while offline leaves hasPendingChangesRef set - the moment the browser
  // reports connectivity again, retry immediately instead of waiting for
  // the next unrelated local edit.
  useEffect(() => {
    if (!cloudSyncAvailable) {
      return;
    }

    function handleOnline() {
      const userId = userIdRef.current;

      if (userId && hasPendingChangesRef.current) {
        void pushSnapshot(userId);
      }
    }

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [cloudSyncAvailable, pushSnapshot]);

  // A light, infrequent cross-device check - not a timer-tick poll (see
  // section 4's explicit "do not require a network request for every Focus
  // Timer tick"), just "when this window becomes visible again, find out if
  // another client started/ended a session while we were away."
  useEffect(() => {
    if (!cloudSyncAvailable) {
      return;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void reconcileActiveFocusSession();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [cloudSyncAvailable, reconcileActiveFocusSession]);

  const signInWithGoogle = useCallback(async () => {
    if (!cloudSyncAvailable) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, [cloudSyncAvailable]);

  const signOut = useCallback(async () => {
    if (!cloudSyncAvailable) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  }, [cloudSyncAvailable]);

  const confirmUploadLocalSnapshot = useCallback(async () => {
    const userId = userIdRef.current;
    setShowUploadPrompt(false);

    if (!userId) {
      return;
    }

    await pushSnapshot(userId);
  }, [pushSnapshot]);

  const dismissUploadPrompt = useCallback(() => {
    setShowUploadPrompt(false);
  }, []);

  const syncNow = useCallback(async () => {
    const userId = userIdRef.current;

    if (!userId) {
      return;
    }

    await pushSnapshot(userId);
  }, [pushSnapshot]);

  const value: CloudSyncStoreValue = {
    isCloudSyncAvailable: cloudSyncAvailable,
    isAuthLoading,
    user,
    syncStatus,
    syncError,
    lastSyncedAt,
    showUploadPrompt,
    signInWithGoogle,
    signOut,
    confirmUploadLocalSnapshot,
    dismissUploadPrompt,
    syncNow,
    reconcileActiveFocusSession,
  };

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}
