"use client";

import { useCloudSync } from "../_lib/hooks/useCloudSync";

export default function AuthControl() {
  const { isCloudSyncAvailable, isAuthLoading, user, syncStatus, signInWithGoogle, signOut } = useCloudSync();

  if (!isCloudSyncAvailable) {
    return null;
  }

  if (isAuthLoading) {
    return <span className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-xs text-slate-500">Checking session…</span>;
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => void signInWithGoogle()}
        className="rounded-full border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-200 transition hover:border-purple-300"
      >
        Sign in with Google
      </button>
    );
  }

  const statusLabel =
    syncStatus === "syncing" ? "Syncing…" : syncStatus === "error" ? "Sync error" : syncStatus === "synced" ? "Synced" : "Local only";

  return (
    <div className="flex items-center gap-2">
      <span
        className={
          "rounded-full border px-3 py-1 text-xs " +
          (syncStatus === "error"
            ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200")
        }
      >
        {statusLabel}
      </span>
      <span className="hidden max-w-[160px] truncate text-xs text-slate-400 md:inline">{user.email}</span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-full border border-slate-800 bg-slate-950/50 px-3 py-1 text-xs text-slate-300 transition hover:border-slate-600 hover:text-white"
      >
        Sign out
      </button>
    </div>
  );
}
