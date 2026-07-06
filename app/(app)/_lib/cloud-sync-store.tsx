"use client";

import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { applyAtlasSnapshot, collectAtlasSnapshot, hasAnyAtlasData, type AtlasSnapshot } from "./atlas-snapshot";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "./supabase/client";
import { MENACE_STORAGE_EVENT } from "./storage-keys";

const ATLAS_TABLE = "user_atlas_data";
const SYNC_DEBOUNCE_MS = 800;

export type CloudSyncStatus = "idle" | "syncing" | "synced" | "error";

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
}>;

export const CloudSyncContext = createContext<CloudSyncStoreValue | null>(null);

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

  const pushSnapshot = useCallback(async (userId: string) => {
    if (!cloudSyncAvailable) {
      return;
    }

    setSyncStatus("syncing");
    setSyncError(null);

    const supabase = getSupabaseBrowserClient();
    const snapshot = collectAtlasSnapshot();
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from(ATLAS_TABLE)
      .upsert({ user_id: userId, data: snapshot, updated_at: nowIso }, { onConflict: "user_id" });

    if (error) {
      setSyncStatus("error");
      setSyncError(error.message);
      return;
    }

    setSyncStatus("synced");
    setLastSyncedAt(nowIso);
  }, [cloudSyncAvailable]);

  const scheduleSync = useCallback(
    (userId: string) => {
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
    const { data, error } = await supabase
      .from(ATLAS_TABLE)
      .select("data, updated_at")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      setSyncStatus("error");
      setSyncError(error.message);
      return;
    }

    if (data) {
      isApplyingRemoteRef.current = true;
      applyAtlasSnapshot(data.data as AtlasSnapshot);
      isApplyingRemoteRef.current = false;
      setSyncStatus("synced");
      setLastSyncedAt((data.updated_at as string | null) ?? new Date().toISOString());
      return;
    }

    setSyncStatus("idle");

    if (hasAnyAtlasData()) {
      setShowUploadPrompt(true);
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
        return;
      }

      if (nextUser.id !== previousUserId) {
        void hydrateFromCloud(nextUser.id);
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
  }, [cloudSyncAvailable, hydrateFromCloud]);

  useEffect(() => {
    if (!cloudSyncAvailable) {
      return;
    }

    function handleLocalChange() {
      if (isApplyingRemoteRef.current) {
        return;
      }

      const userId = userIdRef.current;

      if (!userId) {
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
  };

  return <CloudSyncContext.Provider value={value}>{children}</CloudSyncContext.Provider>;
}
