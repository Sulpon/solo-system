"use client";

import { getLocalDayKey } from "../../_lib/local-day";
import { useDailyPlans } from "../../_lib/hooks/useDailyPlans";
import { useEisenhowerSettings } from "../../_lib/hooks/useEisenhowerSettings";
import { EISENHOWER_QUADRANTS } from "../../_lib/types/quest";
import { groupAssignmentsByQuadrant, resolvePlanAssignments } from "../../_lib/engines/priority-gate-engine";
import type { Quest } from "../../_lib/types/quest";

type TomorrowPlanPanelProps = Readonly<{
  // Already filtered to kind === "task", status === "active" (same list
  // QuestManagerPage.tsx already passes to TodaysPriorityGate) - this is
  // exactly the live Eisenhower board data, just for tomorrow's snapshot.
  tasks: ReadonlyArray<Quest>;
}>;

function getTomorrowDayKey(referenceDate: Date = new Date()) {
  const tomorrow = new Date(referenceDate);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDayKey(tomorrow);
}

// Evening Planning's only new UI - the user plans tomorrow by using the
// EXACT existing Eisenhower board/drag-and-drop below (it's the same
// Quest.eisenhowerQuadrant field, there is no separate "tomorrow's
// quadrant"). This panel's only job is to snapshot the current live
// arrangement as tomorrow's authoritative DailyPlan, or release that
// snapshot for editing again.
export default function TomorrowPlanPanel({ tasks }: TomorrowPlanPanelProps) {
  const { getPlan, lockPlan, unlockPlan } = useDailyPlans();
  const { quadrantNames } = useEisenhowerSettings();

  const tomorrowKey = getTomorrowDayKey();
  const plan = getPlan(tomorrowKey);
  // Live derivation whenever the plan isn't locked (including "no plan
  // exists yet") - see resolvePlanAssignments. Once locked, this reflects
  // the frozen snapshot instead, exactly like TodaysPriorityGate does for
  // today - so the summary counts below always describe what LOCK
  // TOMORROW would capture (or already captured).
  const assignments = resolvePlanAssignments(plan, tasks);
  const tasksByQuadrant = groupAssignmentsByQuadrant(assignments, tasks);
  const isLocked = Boolean(plan?.locked);

  function handleLock() {
    lockPlan(tomorrowKey, assignments);
  }

  function handleUnlock() {
    unlockPlan(tomorrowKey);
  }

  return (
    <div data-testid="tomorrow-plan-panel" className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Plan Tomorrow</p>
          <p className="mt-1 text-sm text-slate-400">
            {isLocked ? "Tomorrow's plan is locked - this is what the Priority Gate will use in the morning." : "Arrange tomorrow's Tasks using the Eisenhower board below, then lock the plan."}
          </p>
        </div>
        {isLocked ? (
          <button type="button" onClick={handleUnlock} className="shrink-0 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-amber-400/50 hover:text-white">
            Unlock to Edit
          </button>
        ) : (
          <button
            type="button"
            onClick={handleLock}
            disabled={assignments.length === 0}
            className="shrink-0 rounded-xl border border-cyan-400/50 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Lock Tomorrow&rsquo;s Plan
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {EISENHOWER_QUADRANTS.map((quadrant) => (
          <span key={quadrant} className="rounded-full border border-slate-700 bg-slate-950/60 px-2.5 py-1 text-slate-300">
            {quadrantNames[quadrant]}: <span className="font-semibold text-white">{tasksByQuadrant[quadrant].length}</span>
          </span>
        ))}
      </div>

      {isLocked && plan ? <p className="mt-2 text-[11px] text-emerald-300">🔒 Locked {new Date(plan.updatedAt).toLocaleString()}</p> : null}
    </div>
  );
}
