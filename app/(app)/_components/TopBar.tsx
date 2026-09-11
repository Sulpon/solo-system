"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Grid3x3 } from "lucide-react";
import AuthControl from "./AuthControl";
import FocusMiniTimer from "./focus/FocusMiniTimer";
import WorkoutMiniTimer from "./workouts/WorkoutMiniTimer";
import { useAtlasContext } from "../_lib/atlas-context";
import { useEisenhowerSettings } from "../_lib/hooks/useEisenhowerSettings";
import { useOnlineStatus } from "../_lib/hooks/useOnlineStatus";
import { usePersonalIntelligence } from "../_lib/hooks/usePersonalIntelligence";

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

type TopBarProps = Readonly<{
  onOpenMenu?: () => void;
  // Wired up in later phases (Launcher/Notification Center) - safe no-ops
  // until then, added now so this file doesn't need touching again just to
  // add the prop plumbing.
  onOpenLauncher?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationCount?: number;
}>;

export default function TopBar({ onOpenMenu, onOpenLauncher, onOpenNotifications, unreadNotificationCount = 0 }: TopBarProps) {
  // The Global Atlas Context (see _lib/atlas-context.ts) - the System Bar's
  // contextual pill is just another read of the one real execution session
  // plus the same Priority Gate derivation the Quests page already uses,
  // never a second source of truth for what's active or what matters next.
  const { activeQuest, activeFocusSession, isQuestExecution, currentPriorityQuadrant, currentLevel, dailyXp } = useAtlasContext();
  const { quadrantNames } = useEisenhowerSettings();
  const { nextAction } = usePersonalIntelligence();
  const isOnline = useOnlineStatus();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const currentTime = useMemo(() => formatTime(now), [now]);
  const missionTitle = isQuestExecution && activeFocusSession ? activeQuest?.title ?? "Focus Session" : null;
  // When nothing is actively executing, the pill communicates what SHOULD
  // happen next (the current Priority Gate quadrant) instead of going
  // blank - the same "current priority" concept section 4 of the Phase 3
  // spec asks for, reusing the exact Priority Gate state already computed.
  const priorityLabel = !missionTitle && currentPriorityQuadrant ? quadrantNames[currentPriorityQuadrant] : null;
  // Third fallback: no active mission AND the Priority Gate is fully
  // cleared (or has nothing today) - Phase 11's Next Action Engine already
  // returns null whenever a mission is active, so this is safe to read
  // unconditionally without duplicating that check here.
  const recommendedLabel = !missionTitle && !priorityLabel ? nextAction?.title ?? null : null;

  return (
    <div className="flex items-center justify-between gap-3 border-b border-purple-500/10 pb-4 text-sm text-slate-400">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onOpenLauncher}
          aria-label="Open Atlas launcher"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-200 transition hover:border-purple-400/60 hover:text-white"
        >
          <Grid3x3 className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Open navigation menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/50 text-slate-300 transition hover:border-purple-400/60 hover:text-white md:hidden"
        >
          <span aria-hidden="true">☰</span>
        </button>
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Welcome back</p>
          <p className="mt-1 font-semibold text-purple-300">Atlas</p>
        </div>
        {missionTitle ? (
          <span className="hidden max-w-[220px] items-center gap-1.5 truncate rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 lg:flex">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300 motion-safe:animate-pulse" aria-hidden="true" />
            <span className="truncate">{missionTitle}</span>
          </span>
        ) : priorityLabel ? (
          <span className="hidden max-w-[220px] items-center gap-1.5 truncate rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-200 lg:flex">
            <span className="text-[9px] uppercase tracking-[0.1em] text-amber-300/80">Priority</span>
            <span className="truncate">{priorityLabel}</span>
          </span>
        ) : recommendedLabel ? (
          <span className="hidden max-w-[220px] items-center gap-1.5 truncate rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs font-semibold text-slate-300 lg:flex">
            <span className="text-[9px] uppercase tracking-[0.1em] text-slate-500">Suggested</span>
            <span className="truncate">{recommendedLabel}</span>
          </span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <WorkoutMiniTimer />
        <FocusMiniTimer />
        <span className="hidden items-center gap-4 md:flex">
          <span
            className={
              "flex items-center gap-1.5 rounded-full border px-3 py-1 " +
              (isOnline ? "border-slate-800 bg-slate-950/50" : "border-rose-500/30 bg-rose-500/10 text-rose-200")
            }
          >
            <span className={"h-1.5 w-1.5 rounded-full " + (isOnline ? "bg-emerald-400" : "bg-rose-400")} aria-hidden="true" />
            {isOnline ? "System Online" : "Offline"}
          </span>
          <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-amber-200">LV {currentLevel}</span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-200">+{dailyXp} XP Today</span>
          <span className="text-cyan-300">{currentTime}</span>
        </span>
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/50 text-slate-300 transition hover:border-purple-400/60 hover:text-white"
        >
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadNotificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-950 bg-purple-500 px-1 text-[10px] font-bold text-white">
              {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
            </span>
          ) : null}
        </button>
        <AuthControl />
      </div>
    </div>
  );
}
