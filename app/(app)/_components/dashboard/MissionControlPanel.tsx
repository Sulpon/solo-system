"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Crosshair, Pause, Play } from "lucide-react";
import { useQuestExecutionSession } from "../focus/useQuestExecutionSession";
import { formatFocusDuration } from "../focus/focus-format";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useEisenhowerSettings } from "../../_lib/hooks/useEisenhowerSettings";
import { useAtlasContext } from "../../_lib/atlas-context";
import AskJarvisLink from "../jarvis/AskJarvisLink";

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest > 0 ? `${hours}h ${rest}m` : `${hours}h`;
}

// The Dashboard's command-center strip - Section 7 of the Atlas OS Phase 3
// spec: it should answer "what matters now / what am I doing / what's next
// / what's my state / what progress happened / what needs attention"
// without becoming a grid of unrelated cards. Everything here is read
// straight from useAtlasContext() (Global Atlas Context) and
// useQuestExecutionSession() - the exact same hooks FocusOverlay, the Tauri
// Companion, and the browser Companion already use for the mission itself,
// plus the Priority Gate/Calendar engines the Quests and Calendar pages
// already use for "what's next." No second source of truth, no fake data.
export default function MissionControlPanel() {
  const { activeSession, isQuestExecution, linkedQuest, elapsedSeconds, isRunning, checklistProgress, pauseSession, resumeSession, expand } = useQuestExecutionSession();
  const { attributes } = useAttributes();
  const { quadrantNames } = useEisenhowerSettings();
  const { currentPriorityQuadrant, presentMoment } = useAtlasContext();

  const categoryName = useMemo(
    () => (linkedQuest ? attributes.find((attribute) => attribute.id === linkedQuest.categoryId)?.name ?? null : null),
    [attributes, linkedQuest],
  );

  const nextCommitmentLabel = presentMoment.nextCommitment
    ? `${presentMoment.nextCommitment.time} · ${presentMoment.nextCommitment.title}`
    : "Nothing else scheduled today";

  if (!activeSession || !isQuestExecution) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Mission Control</p>
            {presentMoment.importantWorkComplete ? (
              <p className="mt-1 text-sm font-semibold text-emerald-300">Important work complete for today.</p>
            ) : currentPriorityQuadrant ? (
              <p className="mt-1 text-sm text-slate-300">
                Current priority: <span className="font-semibold text-white">{quadrantNames[currentPriorityQuadrant]}</span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-400">No active mission. Take a Quest to start one.</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <AskJarvisLink label="Ask JARVIS" />
            <Link href="/quests" className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
              Open Quests
            </Link>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-3 text-xs text-slate-500">
          <span>
            Next: <span className="text-slate-300">{nextCommitmentLabel}</span>
          </span>
          {presentMoment.remainingPriorityCategories > 0 ? (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-amber-200">
              {presentMoment.remainingPriorityCategories} priority {presentMoment.remainingPriorityCategories === 1 ? "category" : "categories"} remaining
            </span>
          ) : null}
        </div>
      </div>
    );
  }

  const minimumPercent = checklistProgress && checklistProgress.minimumTotal > 0 ? (checklistProgress.minimumCompleted / checklistProgress.minimumTotal) * 100 : null;

  return (
    <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 shadow-[0_0_30px_rgba(88,28,135,0.16)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple-300 motion-safe:animate-pulse" aria-hidden="true" />
            Mission Control{categoryName ? ` · ${categoryName}` : ""}
          </p>
          <p className="mt-1 truncate text-lg font-black text-white">{linkedQuest?.title ?? "Focus Session"}</p>
        </div>
        <p className="shrink-0 font-mono text-2xl font-black tabular-nums text-white">{formatFocusDuration(elapsedSeconds)}</p>
      </div>

      {minimumPercent !== null ? (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            <span>Minimum Success</span>
            <span>
              {checklistProgress?.minimumCompleted}/{checklistProgress?.minimumTotal}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-300" style={{ width: `${minimumPercent}%` }} />
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {isRunning ? (
          <button type="button" onClick={pauseSession} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/50 hover:text-white">
            <Pause className="h-3.5 w-3.5" aria-hidden="true" /> Pause
          </button>
        ) : (
          <button type="button" onClick={resumeSession} className="flex items-center gap-1.5 rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
            <Play className="h-3.5 w-3.5" aria-hidden="true" /> Resume
          </button>
        )}
        <button type="button" onClick={expand} className="flex items-center gap-1.5 rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
          <Crosshair className="h-3.5 w-3.5" aria-hidden="true" /> View Mission
        </button>
      </div>

      <p className="mt-3 border-t border-purple-500/20 pt-3 text-xs text-slate-500">
        Next after this: <span className="text-slate-300">{nextCommitmentLabel}</span>
        {presentMoment.availableUnscheduledMinutes !== null ? <span className="text-slate-600"> · {formatMinutes(presentMoment.availableUnscheduledMinutes)} open</span> : null}
      </p>
    </div>
  );
}
