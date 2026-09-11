"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, Sparkles, X } from "lucide-react";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import { getEvents } from "../../_lib/activity-events";
import { NOTIFICATIONS_LAST_SEEN_KEY } from "../../_lib/storage-keys";
import { usePersonalIntelligence } from "../../_lib/hooks/usePersonalIntelligence";
import { getNotifiableInsights } from "../../_lib/intelligence/insight-engine";
import { useAchievementMoments } from "../../_lib/hooks/useAchievementMoments";
import { getNotifiableAchievementMoments } from "../../_lib/achievements/achievement-moment-engine";
import AchievementMomentCard from "../achievements/AchievementMomentCard";

const MAX_SHOWN = 40;

function formatRelativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

type NotificationCenterProps = Readonly<{ onClose: () => void }>;

// Backed entirely by useProgression().activityEvents - the same real,
// persisted, deduped event log every other Atlas surface already reads
// (Chronicle, progression sync effects). No fake/demo notification data:
// this panel simply presents that existing history, it doesn't invent one.
//
// Phase 11 Step 12 adds one small, separate "Atlas Intelligence" section
// above that feed - at most 2 high-priority goal_risk/momentum insights
// (getNotifiableInsights, deliberately narrow to avoid notification spam).
// These are computed live, never written into the persisted activityEvents
// log, so the real event history/unread-count logic below stays untouched.
//
// Phase 12 Step 11 adds a second, equally narrow section for high-
// significance Achievement Moments (getNotifiableAchievementMoments, capped
// at 2, significance >= 70 only) - reuses AchievementMomentCard verbatim
// rather than a second achievement-rendering surface.
export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [canUsePortal] = useState(() => typeof document !== "undefined");
  const { activityEvents } = useProgression();
  const { insights } = usePersonalIntelligence();
  const { moments: achievementMoments } = useAchievementMoments();
  const [, setLastSeenAt] = useLocalStorageState<string | null>(NOTIFICATIONS_LAST_SEEN_KEY, null);
  // Captured once at open, so items that arrived before THIS open still
  // show as "new" for the duration of this viewing, even though opening
  // immediately marks them read for next time.
  const openedAtRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    setLastSeenAt(openedAtRef.current);
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  if (!canUsePortal) {
    return null;
  }

  const events = getEvents(activityEvents).slice(0, MAX_SHOWN);
  const notifiableInsights = getNotifiableInsights(insights);
  const notifiableAchievements = getNotifiableAchievementMoments(achievementMoments);

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/50 p-4 pt-16 backdrop-blur-sm" onClick={onClose}>
      <div
        className="flex max-h-[75vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-purple-500/30 bg-slate-950/95 shadow-[0_0_60px_rgba(124,58,237,0.3)] backdrop-blur-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-800 px-4 py-3">
          <Bell className="h-4 w-4 text-purple-300" aria-hidden="true" />
          <p className="font-black text-white">Notifications</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition hover:border-purple-400/60 hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {notifiableInsights.length > 0 ? (
            <div className="border-b border-slate-900 bg-cyan-400/5">
              <p className="flex items-center gap-1.5 px-4 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-300">
                <Sparkles className="h-3 w-3" aria-hidden="true" /> Atlas Intelligence
              </p>
              {notifiableInsights.map((insight) => (
                <div key={insight.id} className="px-4 py-3">
                  <p className="text-sm font-semibold text-white">{insight.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{insight.evidence.join(" · ")}</p>
                </div>
              ))}
            </div>
          ) : null}
          {notifiableAchievements.length > 0 ? (
            <div className="space-y-3 border-b border-slate-900 bg-amber-400/5 p-3">
              {notifiableAchievements.map((moment) => (
                <AchievementMomentCard key={moment.id} moment={moment} />
              ))}
            </div>
          ) : null}
          {events.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Nothing yet - complete a Quest or hit a milestone and it will show up here.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="border-b border-slate-900 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold text-white">{event.title}</p>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-slate-500">{formatRelativeTime(event.createdAt)}</span>
                </div>
                {event.description ? <p className="mt-0.5 text-xs text-slate-400">{event.description}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
