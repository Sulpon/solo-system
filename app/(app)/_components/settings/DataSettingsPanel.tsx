"use client";

import { useMemo } from "react";
import Card from "../Card";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useCloudSync } from "../../_lib/hooks/useCloudSync";
import DataSafetyPanel from "./DataSafetyPanel";
import { CONNECTION_STATE_LABELS } from "../../_lib/supabase/config";
import { MENACE_STORAGE_EVENT, STORAGE_KEYS } from "../../_lib/storage-keys";

function useDataItems() {
  const { attributes } = useAttributes();

  return useMemo(
    () => [
      { label: "Dashboard layout", key: STORAGE_KEYS.dashboardLayout },
      { label: "Dashboard row layout", key: STORAGE_KEYS.dashboardGridLayout },
      ...attributes.map((attribute) => ({ label: attribute.name + " widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":" + attribute.id })),
      { label: "Goal Tree widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":goal-tree" },
      { label: "Quest widgets", key: STORAGE_KEYS.pageWidgetLayoutPrefix + ":quests" },
      { label: "Quest list", key: STORAGE_KEYS.questList },
      { label: "Quest completions", key: STORAGE_KEYS.questCompletions },
      { label: "Goal Tree", key: STORAGE_KEYS.goalTree },
      { label: "Goal XP events", key: STORAGE_KEYS.goalXpEvents },
      { label: "Activity events", key: STORAGE_KEYS.activityEvents },
      { label: "Daily snapshots", key: STORAGE_KEYS.dailySnapshots },
      { label: "Appearance", key: STORAGE_KEYS.appearance },
      { label: "Career Vision", key: STORAGE_KEYS.careerVision },
      { label: "Education entries", key: STORAGE_KEYS.educationEntries },
      { label: "Skill entries", key: STORAGE_KEYS.skillEntries },
      { label: "Experience entries", key: STORAGE_KEYS.experienceEntries },
      { label: "Company entries", key: STORAGE_KEYS.companyEntries },
      { label: "Vacancy entries", key: STORAGE_KEYS.vacancyEntries },
      { label: "CV entries", key: STORAGE_KEYS.cvEntries },
      { label: "Cover letter entries", key: STORAGE_KEYS.coverLetterEntries },
      { label: "LinkedIn profile", key: STORAGE_KEYS.linkedInProfile },
      { label: "Portfolio profile", key: STORAGE_KEYS.portfolioProfile },
    ],
    [attributes],
  );
}

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
  const { isCloudSyncAvailable, isAuthLoading, user, syncStatus, syncError, lastSyncedAt, signInWithGoogle, syncNow, connectionState, configurationReason, needsReconciliation, cloudComparison, confirmReconciliation } =
    useCloudSync();

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="atlas-accent text-xs font-semibold uppercase tracking-[0.22em]">Cloud Sync</p>
          <h2 className="atlas-display mt-2 text-2xl font-bold text-white">Google account sync</h2>
        </div>
        <span
          data-testid="cloud-connection-state"
          className={
            "rounded-lg border px-3 py-1.5 text-xs font-semibold " +
            (connectionState === "connected"
              ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-100"
              : connectionState === "not-configured"
                ? "border-white/15 bg-white/[0.04] text-slate-300"
                : "border-amber-400/40 bg-amber-400/10 text-amber-100")
          }
        >
          {CONNECTION_STATE_LABELS[connectionState]}
        </span>
      </div>

      {!isCloudSyncAvailable && (
        <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <p className="text-sm text-slate-300">Atlas is running local-only. Your data is on this device and in any backup you have made.</p>
          {/* The specific reason, so setting it up means fixing a named
              value rather than guessing. Never echoes the values. */}
          {configurationReason ? <p className="atlas-muted mt-1.5 text-xs">Reason: {configurationReason}</p> : null}
        </div>
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

      {needsReconciliation && cloudComparison ? (
        <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-400/[0.07] p-4" data-testid="reconciliation-required">
          <p className="text-sm font-semibold text-amber-100">Existing cloud data detected. Initial sync requires reconciliation.</p>
          <p className="atlas-muted mt-1 text-xs">
            This device has not synced with this project before, yet the cloud already holds data. Nothing has been changed in either place. Review the comparison, then decide.
          </p>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <p className="atlas-muted">
              Local keys: <span className="text-white">{cloudComparison.localKeyCount}</span> · only here: <span className="text-white">{cloudComparison.localOnlyKeys.length}</span>
            </p>
            <p className="atlas-muted">
              Cloud keys: <span className="text-white">{cloudComparison.cloudKeyCount}</span> · only there: <span className="text-white">{cloudComparison.cloudOnlyKeys.length}</span>
            </p>
            <p className="atlas-muted">
              Differing: <span className="text-white">{cloudComparison.differingKeys.length}</span>
            </p>
            <p className="atlas-muted">
              Identical: <span className="text-white">{cloudComparison.identicalKeys.length}</span>
            </p>
          </div>

          {cloudComparison.entities.length > 0 ? (
            <div className="mt-3 grid gap-x-4 gap-y-0.5 sm:grid-cols-2">
              {cloudComparison.entities.map((entity) => (
                <div key={entity.key} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="atlas-muted truncate">{entity.label}</span>
                  <span className="shrink-0 text-white/90">
                    {entity.local ?? "—"} local · {entity.cloud ?? "—"} cloud
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <p className="atlas-muted mt-3 text-xs">
            Continuing runs Atlas&rsquo;s existing merge: entities from both sides are kept and combined by id. Back up first if you have not already.
          </p>
          <button
            type="button"
            onClick={() => void confirmReconciliation()}
            className="mt-3 rounded-xl border border-amber-400/50 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20"
          >
            Merge local and cloud
          </button>
        </div>
      ) : null}

      {isCloudSyncAvailable && !isAuthLoading && user && (
        <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-white">{user.email}</p>
              <p className="mt-1 text-sm text-slate-500">Last synced: {formatSyncedAt(lastSyncedAt)}</p>
              {syncStatus === "offline" && <p className="mt-1 text-sm text-amber-300">Offline - changes will sync once you&apos;re back online.</p>}
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
  const dataItems = useDataItems();

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

      <DataSafetyPanel />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-300">Data</p>
            <h2 className="mt-2 text-2xl font-black text-white">Stored on this device</h2>
            <p className="mt-2 text-sm text-slate-400">This clears only data stored on this device. Create a backup above first — clearing cannot be undone. Signed-in users should Sync Now after clearing to update the cloud copy.</p>
          </div>
          <button type="button" onClick={clearAll} className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:border-rose-300">Clear All Local Data</button>
        </div>

        <div className="mt-5 space-y-3">
          {dataItems.map((item) => (
            <div key={item.key} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
              <h3 className="font-bold text-white">{item.label}</h3>
              <button type="button" onClick={() => clearKey(item.key)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-rose-400/60 hover:text-white">Clear</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
