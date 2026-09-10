"use client";

import { useEffect, useRef, useState } from "react";
import { getLocalDayKey } from "../../_lib/local-day";
import { useDailyPlans } from "../../_lib/hooks/useDailyPlans";
import { useEisenhowerSettings } from "../../_lib/hooks/useEisenhowerSettings";
import { computePriorityGateState, groupAssignmentsByQuadrant, isTaskMinimumSuccessReached, resolvePlanAssignments } from "../../_lib/engines/priority-gate-engine";
import { getChecklistProgress } from "../../_lib/engines/checklist-engine";
import QuestExecutionControl from "./QuestExecutionControl";
import type { EisenhowerQuadrant, Quest, QuestCompletion } from "../../_lib/types/quest";

type TodaysPriorityGateProps = Readonly<{
  // Already filtered to kind === "task", status === "active" by the caller
  // (QuestManagerPage.tsx) - Habits never enter the gate.
  tasks: ReadonlyArray<Quest>;
  completions: ReadonlyArray<QuestCompletion>;
  onSelect: (quest: Quest) => void;
}>;

// Presentational only - intentionally mirrors QuestManagerPage.tsx's own
// (module-private) quadrant icon lookup rather than importing it, to avoid
// widening that page's exports for a 4-entry emoji table.
const QUADRANT_ICONS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "🔴",
  urgent_not_important: "🟠",
  not_urgent_important: "🟡",
  not_urgent_not_important: "⚪",
};

function TaskMinimumBadge({ quest, completions, referenceDate }: Readonly<{ quest: Quest; completions: ReadonlyArray<QuestCompletion>; referenceDate: Date }>) {
  const reached = isTaskMinimumSuccessReached(quest, completions, referenceDate);
  const mode = quest.checklistMode ?? "none";
  const progress = mode === "none" ? null : getChecklistProgress(quest.checklist);

  return (
    <span className={"shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold " + (reached ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-slate-700 text-slate-400")}>
      {reached ? "Minimum Success ✓" : progress ? `Minimum ${progress.minimumCompleted}/${progress.minimumTotal}` : "Not completed yet"}
    </span>
  );
}

function GateTaskCard({ task, completions, referenceDate, onSelect }: Readonly<{ task: Quest; completions: ReadonlyArray<QuestCompletion>; referenceDate: Date; onSelect: (quest: Quest) => void }>) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/55 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={() => onSelect(task)} className="truncate text-left text-sm font-bold text-white transition hover:text-purple-200 hover:underline">
          {task.title}
        </button>
        <TaskMinimumBadge quest={task} completions={completions} referenceDate={referenceDate} />
      </div>
      <div className="mt-2">
        <QuestExecutionControl quest={task} />
      </div>
    </div>
  );
}

// The morning half of the Evening Plan -> Morning Priority Gate feature.
// Purely a read-derived summary layer sitting above the existing Tasks
// Eisenhower board (QuestManagerPage.tsx) - it never mutates Quest data,
// never moves a Task between quadrants, and never marks anything complete.
// TAKE QUEST is the exact existing QuestExecutionControl, unmodified.
export default function TodaysPriorityGate({ tasks, completions, onSelect }: TodaysPriorityGateProps) {
  const { getPlan, recordOverride } = useDailyPlans();
  const { quadrantNames } = useEisenhowerSettings();
  const [expandedQuadrant, setExpandedQuadrant] = useState<EisenhowerQuadrant | null>(null);
  const [transition, setTransition] = useState<Readonly<{ cleared: EisenhowerQuadrant; unlocked: EisenhowerQuadrant | null }> | null>(null);
  // undefined = "haven't captured a baseline yet" (avoids showing a false
  // transition banner on first mount); null is a real, meaningful gate
  // state ("everything cleared").
  const previousCurrentRef = useRef<EisenhowerQuadrant | null | undefined>(undefined);

  const referenceDate = new Date();
  const todayKey = getLocalDayKey(referenceDate);
  const plan = getPlan(todayKey);
  const assignments = resolvePlanAssignments(plan, tasks);
  const tasksByQuadrant = groupAssignmentsByQuadrant(assignments, tasks);
  const gateState = computePriorityGateState(tasksByQuadrant, completions, referenceDate);

  useEffect(() => {
    if (previousCurrentRef.current === undefined) {
      previousCurrentRef.current = gateState.currentQuadrant;
      return;
    }

    if (previousCurrentRef.current !== null && previousCurrentRef.current !== gateState.currentQuadrant) {
      const clearedQuadrant = previousCurrentRef.current;
      setTransition({ cleared: clearedQuadrant, unlocked: gateState.currentQuadrant });
      previousCurrentRef.current = gateState.currentQuadrant;
      const timeout = window.setTimeout(() => setTransition(null), 6000);
      return () => window.clearTimeout(timeout);
    }

    previousCurrentRef.current = gateState.currentQuadrant;
  }, [gateState.currentQuadrant]);

  function handleToggleLocked(quadrant: EisenhowerQuadrant) {
    const alreadyExpanded = expandedQuadrant === quadrant;
    setExpandedQuadrant(alreadyExpanded ? null : quadrant);

    if (!alreadyExpanded) {
      recordOverride(todayKey, quadrant);
    }
  }

  if (tasks.length === 0) {
    return null;
  }

  const currentStatus = gateState.quadrantStatuses.find((status) => status.quadrant === gateState.currentQuadrant);
  const otherStatuses = gateState.quadrantStatuses.filter((status) => status.quadrant !== gateState.currentQuadrant);

  return (
    <div data-testid="todays-priority-gate" className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      {transition ? (
        <div className="rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-100">
          <p className="font-semibold">{quadrantNames[transition.cleared]} cleared.</p>
          <p>{transition.unlocked ? `Next Priority Unlocked: ${quadrantNames[transition.unlocked]}` : "All priorities cleared for today."}</p>
        </div>
      ) : null}

      {assignments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-center text-sm text-slate-400">
          No Tasks assigned to Eisenhower quadrants yet - drag Tasks into a quadrant below to set today&rsquo;s priorities.
        </div>
      ) : currentStatus ? (
        <div className="rounded-xl border border-purple-400/40 bg-purple-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Today&rsquo;s Priority</p>
          <h3 className="mt-1 flex items-center gap-2 text-lg font-black text-white">
            <span>{QUADRANT_ICONS[currentStatus.quadrant]}</span>
            {quadrantNames[currentStatus.quadrant]}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            {currentStatus.tasks.filter((task) => !isTaskMinimumSuccessReached(task, completions, referenceDate)).length} of {currentStatus.tasks.length} Task
            {currentStatus.tasks.length === 1 ? "" : "s"} remaining
          </p>

          <div className="mt-3 space-y-2">
            {currentStatus.tasks.map((task) => (
              <GateTaskCard key={task.id} task={task} completions={completions} referenceDate={referenceDate} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-4 text-center">
          <p className="text-sm font-semibold text-emerald-200">All priorities cleared for today.</p>
        </div>
      )}

      {otherStatuses.length > 0 ? (
        <div className="space-y-2">
          {otherStatuses.map((status) => (
            <div key={status.quadrant} className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
              <button type="button" onClick={() => handleToggleLocked(status.quadrant)} className="flex w-full items-center justify-between gap-2 text-left">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">
                  <span>{status.cleared ? "🔓" : "🔒"}</span>
                  {quadrantNames[status.quadrant]}
                </span>
                <span className="text-xs text-slate-500">{status.cleared ? "Cleared" : `${status.tasks.length} Task${status.tasks.length === 1 ? "" : "s"} locked`}</span>
              </button>

              {expandedQuadrant === status.quadrant ? (
                <div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
                  {!status.cleared ? <p className="text-[11px] text-amber-300">You&rsquo;re working outside today&rsquo;s recommended priority order.</p> : null}
                  {status.tasks.length === 0 ? (
                    <p className="text-xs text-slate-500">No Tasks in this quadrant.</p>
                  ) : (
                    status.tasks.map((task) => <GateTaskCard key={task.id} task={task} completions={completions} referenceDate={referenceDate} onSelect={onSelect} />)
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
