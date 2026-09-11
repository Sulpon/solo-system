"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuestExecutionSession } from "../_components/focus/useQuestExecutionSession";
import { useProgression } from "./hooks/useProgression";
import { useDailyPlans } from "./hooks/useDailyPlans";
import { computePriorityGateState, groupAssignmentsByQuadrant, resolvePlanAssignments, type PriorityGateState } from "./engines/priority-gate-engine";
import { getQuestsForDate, type CalendarQuestItem } from "./engines/quest-calendar-engine";
import { computePresentMomentState, type PresentMomentState } from "./engines/present-moment-engine";
import { getLocalDayKey } from "./local-day";
import { isNavItemActive, useAppNavItems, type AppNavItem } from "./icons/app-icon-map";
import type { Quest } from "./types/quest";
import type { FocusSession } from "./types/focus";
import type { ChecklistProgress } from "./engines/checklist-engine";

// The Global Atlas Context (Phase 3, section 2): a single place that
// composes ALREADY-EXISTING sources of truth - useQuestExecutionSession
// (Focus/Quest execution), useProgression (XP/level/quest data), the
// Priority Gate engine (today's current priority quadrant - the exact same
// derivation TodaysPriorityGate.tsx already uses), the Calendar engine
// (today's scheduled items - the exact same derivation the Calendar page
// already uses), and the current route (usePathname) - into one coherent
// read. This owns NO state of its own beyond a 1-minute clock tick; every
// field is a live re-derivation of state that already lives in its real
// owner (focus-store, progression-store, dailyPlans, quest data). Any
// component that needs "what is Atlas doing right now" should read this
// instead of re-deriving pieces of it independently.
export type AtlasContextSnapshot = Readonly<{
  // Focus / Mission
  activeQuest: Quest | null;
  activeFocusSession: FocusSession | null;
  isQuestExecution: boolean;
  isFocusRunning: boolean;
  elapsedSeconds: number;
  checklistProgress: ChecklistProgress | null;
  // Priority
  priorityGateState: PriorityGateState | null;
  currentPriorityQuadrant: PriorityGateState["currentQuadrant"] | null;
  // Today
  todaysCalendarItems: ReadonlyArray<CalendarQuestItem>;
  presentMoment: PresentMomentState;
  // Progression
  currentLevel: number;
  dailyXp: number;
  totalXp: number;
  // Navigation / app identity
  currentApp: AppNavItem | null;
  // Clock
  now: Date;
}>;

export function useAtlasContext(): AtlasContextSnapshot {
  const pathname = usePathname();
  const { activeSession, isQuestExecution, linkedQuest, isRunning, elapsedSeconds, checklistProgress } = useQuestExecutionSession();
  const { isReady, questDefinitions, questCompletions, progressionSummary } = useProgression();
  const { getPlan } = useDailyPlans();
  const navItems = useAppNavItems();

  // A light clock tick (once a minute is plenty - this only needs to keep
  // "next scheduled commitment"/"minutes remaining" fresh, never a Focus
  // timer, which stays entirely owned by useQuestExecutionSession's own
  // timestamp-derived math).
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const activeTasks = useMemo(() => questDefinitions.filter((quest) => quest.kind === "task" && quest.status === "active"), [questDefinitions]);

  const priorityGateState = useMemo(() => {
    if (!isReady) {
      return null;
    }

    const todayKey = getLocalDayKey(now);
    const plan = getPlan(todayKey);
    const assignments = resolvePlanAssignments(plan, activeTasks);
    const tasksByQuadrant = groupAssignmentsByQuadrant(assignments, activeTasks);
    return computePriorityGateState(tasksByQuadrant, questCompletions, now);
    // getPlan reads directly from useLocalStorageState's live value, not a
    // stable identity - keyed on the day string instead so this only
    // recomputes when the day actually changes, not on every plans update.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, activeTasks, questCompletions, now]);

  const todaysCalendarItems = useMemo(
    () => (isReady ? getQuestsForDate(questDefinitions, questCompletions, now, now) : []),
    [isReady, questDefinitions, questCompletions, now],
  );

  const presentMoment = useMemo(
    () =>
      computePresentMomentState({
        gateState: priorityGateState,
        todaysCalendarItems,
        hasActiveMission: Boolean(activeSession && isQuestExecution),
        now,
      }),
    [priorityGateState, todaysCalendarItems, activeSession, isQuestExecution, now],
  );

  const currentApp = useMemo(() => navItems.find((item) => isNavItemActive(pathname, item.href)) ?? null, [navItems, pathname]);

  return {
    activeQuest: linkedQuest,
    activeFocusSession: activeSession,
    isQuestExecution,
    isFocusRunning: isRunning,
    elapsedSeconds,
    checklistProgress,
    priorityGateState,
    currentPriorityQuadrant: priorityGateState?.currentQuadrant ?? null,
    todaysCalendarItems,
    presentMoment,
    currentLevel: isReady ? progressionSummary.currentLevel : 1,
    dailyXp: isReady ? progressionSummary.dailyXP : 0,
    totalXp: isReady ? progressionSummary.totalXP : 0,
    currentApp,
    now,
  };
}
