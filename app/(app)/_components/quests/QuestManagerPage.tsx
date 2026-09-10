"use client";

import { useMemo, useState } from "react";
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import Card from "../Card";
import CustomizablePage from "../page-edit/CustomizablePage";
import { getCatalogWidgetsForPage } from "../../_lib/widgets/catalog-registry";
import { QuestStatsCard, StatNumberCard } from "../page-edit/StatWidgets";
import { isQuestScheduledForDate } from "../../_lib/daily-system";
import { hasCompletedToday } from "../../_lib/quest-storage";
import { getLocalDayKey, parseLocalDayKey } from "../../_lib/local-day";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useWorkout } from "../../_lib/workout-store";
import { useEisenhowerSettings } from "../../_lib/hooks/useEisenhowerSettings";
import { EISENHOWER_QUADRANTS } from "../../_lib/types/quest";
import type { EisenhowerQuadrant, Quest, QuestKind, QuestStatus } from "../../_lib/types/quest";
import QuestForm, { type QuestFormModel } from "./QuestForm";
import QuestBottomBar from "./QuestBottomBar";
import QuestCommandBar from "./QuestCommandBar";
import QuestCompletionModal from "./QuestCompletionModal";
import QuestReflectionModal from "./QuestReflectionModal";
import UndoCompletionModal from "./UndoCompletionModal";
import QuestList from "./QuestList";
import QuestKindSection from "./QuestKindSection";
import QuestDetailPanel from "./QuestDetailPanel";
import { useQuestCompletionFlow } from "./useQuestCompletionFlow";
import { createQuestFormModel, toQuestForm, upsertQuestFromForm } from "./quest-form.utils";
import type { EditablePageSection } from "../page-edit/types";

// Droppable zone ids - QuestKindSection's `id` prop, matched back in
// handleDragEnd. Not persisted anywhere; purely a UI-level identifier for
// "which zone did this land on."
const HABIT_ZONE_ID = "quest-kind-zone-habit";
// A Task with no quadrant chosen yet lands here - the only other "just make
// it a Task" target, replacing the old single flat Tasks zone now that
// Tasks are split into 4 quadrants (see QuestDropTarget below).
const UNASSIGNED_TASK_ZONE_ID = "quest-eisenhower-zone-unassigned";
const eisenhowerZoneId = (quadrant: EisenhowerQuadrant) => `quest-eisenhower-zone-${quadrant}`;

// What dropping onto a given zone should do to the dragged Quest. Every
// Task zone (a quadrant, or Unassigned) sets kind: "task"; only a quadrant
// zone also carries eisenhowerQuadrant. Deliberately flat, non-nested
// droppables (4 quadrants + Unassigned + Habits, all siblings) rather than
// one Tasks zone containing 4 nested zones - dnd-kit's pointerWithin
// collision detection has no reliable "smallest zone wins" tie-break for
// overlapping/nested droppables, so nesting them would make which zone
// actually receives the drop unpredictable.
type QuestDropTarget = Readonly<{ kind: QuestKind; eisenhowerQuadrant?: EisenhowerQuadrant }>;

const ZONE_DROP_TARGETS: Record<string, QuestDropTarget> = {
  [HABIT_ZONE_ID]: { kind: "habit" },
  [UNASSIGNED_TASK_ZONE_ID]: { kind: "task" },
  ...Object.fromEntries(EISENHOWER_QUADRANTS.map((quadrant) => [eisenhowerZoneId(quadrant), { kind: "task", eisenhowerQuadrant: quadrant }])),
};

// Icon + accent per quadrant, in the same order as EISENHOWER_QUADRANTS
// (urgency/importance ranking) - purely presentational, never persisted.
const QUADRANT_ICONS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "🔴",
  urgent_not_important: "🟠",
  not_urgent_important: "🟡",
  not_urgent_not_important: "⚪",
};
const QUADRANT_ACCENTS: Record<EisenhowerQuadrant, { border: string; text: string }> = {
  urgent_important: { border: "border-rose-400/60", text: "text-rose-200" },
  urgent_not_important: { border: "border-orange-400/60", text: "text-orange-200" },
  not_urgent_important: { border: "border-yellow-400/60", text: "text-yellow-200" },
  not_urgent_not_important: { border: "border-slate-400/60", text: "text-slate-300" },
};

type QuestManagerPageProps = Readonly<{}>;
type QuestImportanceFilter = "all" | "today" | "core" | "bonus";

export default function QuestManagerPage({}: QuestManagerPageProps) {
  const [form, setForm] = useState<QuestFormModel | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<QuestImportanceFilter>("today");
  const [logDayKey, setLogDayKey] = useState(() => getLocalDayKey());
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const { isReady, questDefinitions: quests, setQuestDefinitions, questCompletions, activityEvents, progressionSummary } = useProgression();
  const { goalTree, progressGoals } = useGoalTree();
  const { startSession: startWorkoutSession } = useWorkout();
  const { quadrantNames, renameQuadrant } = useEisenhowerSettings();
  const availableWidgets = useMemo(() => getCatalogWidgetsForPage("quests"), []);
  const {
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    beginQuestCompletion,
    confirmQuestCompletion,
    cancelQuestCompletion,
    pendingReflectionQuest,
    submitReflection,
    skipReflection,
    pendingUndo,
    beginUndoCompletion,
    confirmUndoCompletion,
    cancelUndoCompletion,
  } = useQuestCompletionFlow();

  const todayDayKey = useMemo(() => getLocalDayKey(), []);
  const logDate = useMemo(() => parseLocalDayKey(logDayKey), [logDayKey]);
  const isLoggingPastDay = logDayKey !== todayDayKey;

  function completionTimestampForLogDay() {
    if (!isLoggingPastDay) {
      return new Date().toISOString();
    }

    const now = new Date();
    const backdated = new Date(logDate);
    backdated.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return backdated.toISOString();
  }

  const sortedQuests = useMemo(
    () =>
      quests
        .filter((quest) => importanceFilter === "all" || importanceFilter === "today" || (quest.importance ?? "core") === importanceFilter)
        .filter((quest) => importanceFilter !== "today" || (quest.status === "active" && quest.cadence === "daily" && isQuestScheduledForDate(quest)))
        .sort((first, second) => Number(first.status === "archived") - Number(second.status === "archived") || first.title.localeCompare(second.title)),
    [importanceFilter, quests],
  );
  const completedForLogDayIds = useMemo(
    () => new Set(quests.filter((quest) => hasCompletedToday(quest.id, questCompletions, logDate)).map((quest) => quest.id)),
    [quests, questCompletions, logDate],
  );

  // Grouping only - a pure UI split of the same already-filtered list, not a
  // second source of truth. A quest with no `kind` yet falls into its own
  // temporary bucket (never guessed into Task or Habit) rather than being
  // hidden or forced into one of the two real categories.
  const taskQuests = useMemo(() => sortedQuests.filter((quest) => quest.kind === "task"), [sortedQuests]);
  const habitQuests = useMemo(() => sortedQuests.filter((quest) => quest.kind === "habit"), [sortedQuests]);
  const uncategorizedQuests = useMemo(() => sortedQuests.filter((quest) => quest.kind !== "task" && quest.kind !== "habit"), [sortedQuests]);

  // Sub-grouping of Tasks only - same "pure UI split, not a second source
  // of truth" reasoning as taskQuests/habitQuests above. A Task with no
  // eisenhowerQuadrant yet falls into its own Unassigned bucket rather than
  // being hidden or guessed into a quadrant.
  const tasksByQuadrant = useMemo(() => {
    const groups = new Map<EisenhowerQuadrant, Quest[]>(EISENHOWER_QUADRANTS.map((quadrant) => [quadrant, []]));

    for (const quest of taskQuests) {
      if (quest.eisenhowerQuadrant) {
        groups.get(quest.eisenhowerQuadrant)?.push(quest);
      }
    }

    return groups;
  }, [taskQuests]);
  const unassignedTaskQuests = useMemo(() => taskQuests.filter((quest) => !quest.eisenhowerQuadrant), [taskQuests]);

  const [activeDragQuestId, setActiveDragQuestId] = useState<string | null>(null);
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const activeDragQuest = quests.find((quest) => quest.id === activeDragQuestId) ?? null;
  const statsSections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "quest-stats-overview",
        title: "Quest Overview",
        description: "Active core and bonus quests with XP earned.",
        size: "xl",
        readOnly: true,
        content: <QuestStatsCard quests={quests} activityEvents={activityEvents} />,
      },
      {
        id: "quest-completions",
        title: "Completion History",
        description: "Total quest completions recorded locally.",
        size: "md",
        readOnly: true,
        content: <StatNumberCard eyebrow="Completions" title="Quest completions" value={questCompletions.length.toLocaleString()} description="Created when quests are marked complete." accentClass="text-emerald-300" />,
      },
      {
        id: "quest-daily-xp",
        title: "Today XP",
        description: "XP earned today from quests and goal events.",
        size: "md",
        readOnly: true,
        content: <StatNumberCard eyebrow="Today" title="XP earned" value={progressionSummary.dailyXP.toLocaleString()} description="Derived from completion records and XP events." accentClass="text-cyan-300" />,
      },
    ],
    [activityEvents, progressionSummary.dailyXP, questCompletions.length, quests],
  );

  function saveQuest() {
    if (!form || !form.title.trim()) {
      return;
    }

    setQuestDefinitions(upsertQuestFromForm(quests, form));

    setForm(null);
  }

  function setQuestStatus(quest: Quest, status: QuestStatus) {
    const nextQuests = quests.map((item) => (item.id === quest.id ? { ...item, status, updatedAt: new Date().toISOString() } : item));
    setQuestDefinitions(nextQuests);
  }

  // Reassigns the classification (and, for Tasks, the Eisenhower quadrant)
  // on the SAME Quest record - never creates or removes a Quest, never
  // touches completions/streaks/XP/schedule/goal links, and goes through
  // the exact setQuestDefinitions call every other mutation on this page
  // already uses, so it persists (and syncs) exactly like an edit or an
  // archive does. Landing on a Habit zone always clears eisenhowerQuadrant
  // - a Habit can never carry a leftover quadrant from when it was a Task.
  function setQuestClassification(questId: string, target: QuestDropTarget) {
    const nextQuests = quests.map((item) =>
      item.id === questId
        ? { ...item, kind: target.kind, eisenhowerQuadrant: target.kind === "task" ? target.eisenhowerQuadrant : undefined, updatedAt: new Date().toISOString() }
        : item,
    );
    setQuestDefinitions(nextQuests);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragQuestId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    const overId = event.over?.id ? String(event.over.id) : null;
    const target = overId ? ZONE_DROP_TARGETS[overId] : undefined;

    if (target) {
      setQuestClassification(String(event.active.id), target);
    }

    setActiveDragQuestId(null);
  }

  function handleDragCancel() {
    setActiveDragQuestId(null);
  }

  function deleteQuest(questId: string) {
    const nextQuests = quests.filter((quest) => quest.id !== questId);
    setQuestDefinitions(nextQuests);
    setSelectedQuestId((current) => (current === questId ? null : current));
  }

  function linkQuestGoal(questId: string, goalId: string | null) {
    const nextQuests = quests.map((item) => (item.id === questId ? { ...item, linkedProgressGoalId: goalId, updatedAt: new Date().toISOString() } : item));
    setQuestDefinitions(nextQuests);
  }

  const selectedQuest = quests.find((quest) => quest.id === selectedQuestId) ?? null;

  if (!isReady) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">
          Loading quests...
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <QuestCommandBar />

      <CustomizablePage pageId="quests" title="Quest Widgets" subtitle="Read-only quest statistics and progress panels." sections={statsSections} availableWidgets={availableWidgets} />

      <div className={"grid gap-5 " + (selectedQuest ? "lg:grid-cols-[minmax(0,1fr)_420px] lg:items-start" : "")}>
      <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Quest Manager</p>
          <h2 className="mt-2 text-2xl font-black text-white">Create, edit, archive, delete, and complete quests</h2>
          <p className="mt-2 text-sm text-slate-400">Quest definitions and completions are stored locally for now. Active daily quests feed the Dashboard automatically.</p>
        </div>
        <button type="button" onClick={() => setForm(createQuestFormModel())} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Create Quest
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-3">
        <label className="space-y-1.5">
          <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Log completions for</span>
          <input
            type="date"
            value={logDayKey}
            max={todayDayKey}
            onChange={(event) => setLogDayKey(event.target.value || todayDayKey)}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400"
          />
        </label>
        {isLoggingPastDay ? (
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200">Logging a past day</span>
            <button type="button" onClick={() => setLogDayKey(todayDayKey)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              Back to today
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {(["all", "today", "core", "bonus"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setImportanceFilter(filter)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition " +
              (importanceFilter === filter
                ? "border-purple-400/60 bg-purple-500/15 text-purple-100"
                : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
            }
          >
            {filter}
          </button>
        ))}
      </div>

      {sortedQuests.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
          <h3 className="text-lg font-bold text-white">No quests created yet</h3>
          <p className="mt-2 text-sm text-slate-400">Add your first quest to begin building real progress.</p>
          <button
            type="button"
            onClick={() => setForm(createQuestFormModel())}
            className="mt-5 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            Create First Quest
          </button>
        </div>
      ) : (
        <DndContext
          sensors={dragSensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="mt-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-base leading-none">✅</span>
                <h3 className="text-sm font-black uppercase tracking-[0.14em] text-white">Tasks</h3>
                <span className="text-xs text-slate-500">{taskQuests.length}</span>
              </div>

              <div className="mt-2 space-y-3">
                {EISENHOWER_QUADRANTS.map((quadrant) => (
                  <QuestKindSection
                    key={quadrant}
                    id={eisenhowerZoneId(quadrant)}
                    title={quadrantNames[quadrant]}
                    icon={QUADRANT_ICONS[quadrant]}
                    accentBorderClass={QUADRANT_ACCENTS[quadrant].border}
                    accentTextClass={QUADRANT_ACCENTS[quadrant].text}
                    emptyHint="Drag a Task here."
                    quests={tasksByQuadrant.get(quadrant) ?? []}
                    questCompletions={questCompletions}
                    completedTodayIds={completedForLogDayIds}
                    referenceDate={logDate}
                    onEdit={(quest) => setForm(toQuestForm(quest))}
                    onToggleStatus={(quest) => setQuestStatus(quest, quest.status === "active" ? "archived" : "active")}
                    onDelete={deleteQuest}
                    onComplete={(quest) => beginQuestCompletion(quest, completionTimestampForLogDay())}
                    onUndoComplete={(quest) => beginUndoCompletion(quest.id, logDate.toISOString())}
                    onStartWorkout={(quest) => startWorkoutSession({ templateId: quest.linkedWorkoutTemplateId, linkedQuestId: quest.id })}
                    onSelect={(quest) => setSelectedQuestId(quest.id)}
                    selectedQuestId={selectedQuestId}
                    onRenameTitle={(nextTitle) => renameQuadrant(quadrant, nextTitle)}
                  />
                ))}

                {unassignedTaskQuests.length > 0 ? (
                  <QuestKindSection
                    id={UNASSIGNED_TASK_ZONE_ID}
                    title="Unassigned"
                    icon="⬜"
                    accentBorderClass="border-slate-500/60"
                    accentTextClass="text-slate-300"
                    emptyHint="Drag a Task here to clear its priority."
                    quests={unassignedTaskQuests}
                    questCompletions={questCompletions}
                    completedTodayIds={completedForLogDayIds}
                    referenceDate={logDate}
                    onEdit={(quest) => setForm(toQuestForm(quest))}
                    onToggleStatus={(quest) => setQuestStatus(quest, quest.status === "active" ? "archived" : "active")}
                    onDelete={deleteQuest}
                    onComplete={(quest) => beginQuestCompletion(quest, completionTimestampForLogDay())}
                    onUndoComplete={(quest) => beginUndoCompletion(quest.id, logDate.toISOString())}
                    onStartWorkout={(quest) => startWorkoutSession({ templateId: quest.linkedWorkoutTemplateId, linkedQuestId: quest.id })}
                    onSelect={(quest) => setSelectedQuestId(quest.id)}
                    selectedQuestId={selectedQuestId}
                  />
                ) : null}
              </div>
            </div>

            <QuestKindSection
              id={HABIT_ZONE_ID}
              title="Habits"
              icon="🔁"
              accentBorderClass="border-amber-400/60"
              accentTextClass="text-amber-200"
              emptyHint="Drag a quest here to classify it as a Habit."
              quests={habitQuests}
              questCompletions={questCompletions}
              completedTodayIds={completedForLogDayIds}
              referenceDate={logDate}
              onEdit={(quest) => setForm(toQuestForm(quest))}
              onToggleStatus={(quest) => setQuestStatus(quest, quest.status === "active" ? "archived" : "active")}
              onDelete={deleteQuest}
              onComplete={(quest) => beginQuestCompletion(quest, completionTimestampForLogDay())}
              onUndoComplete={(quest) => beginUndoCompletion(quest.id, logDate.toISOString())}
              onStartWorkout={(quest) => startWorkoutSession({ templateId: quest.linkedWorkoutTemplateId, linkedQuestId: quest.id })}
              onSelect={(quest) => setSelectedQuestId(quest.id)}
              selectedQuestId={selectedQuestId}
            />

            {uncategorizedQuests.length > 0 ? (
              <div>
                <div className="flex items-center gap-2 px-1">
                  <span className="text-base leading-none">❔</span>
                  <h3 className="text-sm font-black uppercase tracking-[0.14em] text-slate-400">Uncategorized</h3>
                  <span className="text-xs text-slate-500">{uncategorizedQuests.length}</span>
                </div>
                <p className="mt-1 px-1 text-xs text-slate-500">Not yet a Task or a Habit - drag onto a section above, or set it from Edit Quest.</p>
                <QuestList
                  quests={uncategorizedQuests}
                  questCompletions={questCompletions}
                  completedTodayIds={completedForLogDayIds}
                  referenceDate={logDate}
                  onEdit={(quest) => setForm(toQuestForm(quest))}
                  onToggleStatus={(quest) => setQuestStatus(quest, quest.status === "active" ? "archived" : "active")}
                  onDelete={deleteQuest}
                  onComplete={(quest) => beginQuestCompletion(quest, completionTimestampForLogDay())}
                  onUndoComplete={(quest) => beginUndoCompletion(quest.id, logDate.toISOString())}
                  onStartWorkout={(quest) => startWorkoutSession({ templateId: quest.linkedWorkoutTemplateId, linkedQuestId: quest.id })}
                  onSelect={(quest) => setSelectedQuestId(quest.id)}
                  selectedQuestId={selectedQuestId}
                  draggable
                />
              </div>
            ) : null}
          </div>

          <DragOverlay dropAnimation={null} adjustScale={false}>
            {activeDragQuest ? (
              <div className="flex max-w-xs items-center gap-2 rounded-xl border border-purple-400/60 bg-slate-900 px-3 py-2 shadow-[0_0_30px_rgba(168,85,247,0.35)]">
                <span className="truncate text-sm font-bold text-white">{activeDragQuest.title}</span>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {form ? <QuestForm form={form} isEditing={Boolean(form.id)} onChange={setForm} onCancel={() => setForm(null)} onSave={saveQuest} /> : null}

      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          hasLinkedGoal={Boolean(pendingQuest.linkedProgressGoalId)}
          unit={pendingQuest.completionMetric?.unit}
          progressValue={progressValue}
          logDateLabel={isLoggingPastDay ? logDayKey : undefined}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={confirmQuestCompletion}
        />
      ) : null}

      {pendingReflectionQuest ? (
        <QuestReflectionModal questTitle={pendingReflectionQuest.title} onSkip={skipReflection} onSubmit={submitReflection} />
      ) : null}

      {pendingUndo ? (
        <UndoCompletionModal
          questTitle={pendingUndo.questTitle}
          metricValue={pendingUndo.metricValue}
          unit={pendingUndo.unit}
          goalTitle={pendingUndo.goalTitle}
          goalBefore={pendingUndo.goalBefore}
          goalAfter={pendingUndo.goalAfter}
          hasChallenge={pendingUndo.hasChallenge}
          onCancel={cancelUndoCompletion}
          onConfirm={confirmUndoCompletion}
        />
      ) : null}
      </Card>

      {selectedQuest ? (
        <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950 p-4 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0">
          <button
            type="button"
            onClick={() => setSelectedQuestId(null)}
            className="mb-3 flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white lg:hidden"
          >
            ← Back
          </button>
          <QuestDetailPanel
            quest={selectedQuest}
            completions={questCompletions}
            goalTree={goalTree}
            progressGoals={progressGoals}
            onClose={() => setSelectedQuestId(null)}
            onEdit={(quest) => setForm(toQuestForm(quest))}
            onToggleStatus={(quest) => setQuestStatus(quest, quest.status === "active" ? "archived" : "active")}
            onDelete={deleteQuest}
            onLinkGoal={linkQuestGoal}
          />
        </div>
      ) : null}
      </div>

      <QuestBottomBar />
    </div>
  );
}
