"use client";

import Card from "../Card";
import { useCloudSync } from "../../_lib/hooks/useCloudSync";
import { MENACE_STORAGE_EVENT, STORAGE_KEYS } from "../../_lib/storage-keys";

const dataItems = [
  { label: "Dashboard layout", key: STORAGE_KEYS.dashboardLayout },
  { label: "Dashboard row layout", key: STORAGE_KEYS.dashboardGridLayout },
  { label: "Discipline widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":discipline" },
  { label: "Career widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":career" },
  { label: "Trading widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":trading" },
  { label: "Physical Health widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":physical-health" },
  { label: "Self-Development widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":self-development" },
  { label: "Goal Tree widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":goal-tree" },
  { label: "Quest widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":quests" },
  { label: "Quest list", key: STORAGE_KEYS.questList },
  { label: "Quest completions", key: STORAGE_KEYS.questCompletions },
  { label: "Goal Tree", key: STORAGE_KEYS.goalTree },
  { label: "Goal XP events", key: STORAGE_KEYS.goalXpEvents },
  { label: "Activity events", key: STORAGE_KEYS.activityEvents },
  { label: "Daily snapshots", key: STORAGE_KEYS.dailySnapshots },
  { label: "Appearance", key: STORAGE_KEYS.appearance },
];

function notify(key?: string) {
  window.dispatchEvent(new CustomEvent(MENACE_STORAGE_EVENT, { detail: { key } }));
}

function formatSyncedAt(iso: string | null) {
  if (!iso) {
    return "Never";
  }

  return new Date(iso).toLocaleString();
}

function CloudSyncPanel() {
  const { isCloudSyncAvailable, isAuthLoading, user, syncStatus, syncError, lastSyncedAt, signInWithGoogle, syncNow } = useCloudSync();

  return (
    <Card className="p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Cloud Sync</p>
      <h2 className="mt-2 text-2xl font-black text-white">Google account sync</h2>

      {!isCloudSyncAvailable && (
        <p className="mt-2 text-sm text-slate-400">
          Cloud sync is not configured for this deployment. Atlas is running in local-only mode.
        </p>
      )}

      {isCloudSyncAvailable && isAuthLoading && <p className="mt-2 text-sm text-slate-400">Checking session…</p>}

      {isCloudSyncAvailable && !isAuthLoading && !user && (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm text-slate-400">Sign in to sync your Atlas data across devices.</p>
          <button
            type="button"
            onClick={() => void signInWithGoogle()}
            className="rounded-xl border border-purple-500/40 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:border-purple-300"
          >
            Sign in with Google
          </button>
        </div>
      )}

      {isCloudSyncAvailable && !isAuthLoading && user && (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white">{user.email}</p>
              <p className="mt-1 text-sm text-slate-500">Last synced: {formatSyncedAt(lastSyncedAt)}</p>
              {syncStatus === "error" && syncError && <p className="mt-1 text-sm text-rose-300">Sync error: {syncError}</p>}
            </div>
            <button
              type="button"
              onClick={() => void syncNow()}
              disabled={syncStatus === "syncing"}
              className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {syncStatus === "syncing" ? "Syncing…" : "Sync Now"}
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

export default function DataSettingsPanel() {
  function clearKey(key: string) {
    window.localStorage.removeItem(key);
    notify(key);
  }

  function clearAll() {
    dataItems.forEach((item) => window.localStorage.removeItem(item.key));
    notify();
  }

  return (
    <div className="space-y-5">
      <CloudSyncPanel />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Data</p>
            <h2 className="mt-2 text-2xl font-black text-white">Local storage controls</h2>
            <p className="mt-2 text-sm text-slate-400">This clears only browser-local MENACE state. Signed-in users should Sync Now after clearing to update the cloud copy.</p>
          </div>
          <button type="button" onClick={clearAll} className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300">Clear All Local Data</button>
        </div>

        <div className="mt-5 space-y-3">
          {dataItems.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
              <div>
                <h3 className="font-bold text-white">{item.label}</h3>
                <p className="mt-1 text-sm text-slate-500">{item.key}</p>
              </div>
              <button type="button" onClick={() => clearKey(item.key)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-400/60 hover:text-white">Clear</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
