"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import QuestForm, { type QuestFormModel } from "../quests/QuestForm";
import QuestCompletionModal from "../quests/QuestCompletionModal";
import QuestReflectionModal from "../quests/QuestReflectionModal";
import UndoCompletionModal from "../quests/UndoCompletionModal";
import QuestDetailPanel from "../quests/QuestDetailPanel";
import { useQuestCompletionFlow } from "../quests/useQuestCompletionFlow";
import { createQuestFormModel, toQuestForm, upsertQuestFromForm } from "../quests/quest-form.utils";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { getAncestorChainForQuest } from "../../_lib/engines/planning-engine";
import { applyQuestSchedule, buildCalendarMonth, buildCalendarWeek, getQuestsForDate, isQuestUnscheduled } from "../../_lib/engines/quest-calendar-engine";
import type { CalendarDayCell, CalendarQuestItem, QuestSchedulePatch } from "../../_lib/engines/quest-calendar-engine";
import { getLocalDayKey, parseLocalDayKey } from "../../_lib/local-day";
import type { Quest, QuestStatus } from "../../_lib/types/quest";
import CalendarHeader, { type CalendarView } from "./CalendarHeader";
import CalendarFilters, { type CalendarStatusFilter } from "./CalendarFilters";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
import DayPanel from "./DayPanel";

function filterCellItems(cell: CalendarDayCell, status: CalendarStatusFilter): CalendarDayCell {
  if (status === "all") return cell;
  return { ...cell, items: cell.items.filter((item) => item.status === status) };
}

function formatWeekRangeLabel(days: ReadonlyArray<CalendarDayCell>) {
  const start = days[0]?.date;
  const end = days[days.length - 1]?.date;
  if (!start || !end) return "";
  const sameYear = start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
  const endLabel = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  return `${startLabel} – ${endLabel}`;
}

export default function CalendarPageClient() {
  const { isReady, questDefinitions: quests, setQuestDefinitions, questCompletions } = useProgression();
  const { goalTree, progressGoals } = useGoalTree();
  const { attributes: categories } = useAttributes();

  const [view, setView] = useState<CalendarView>("month");
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDayKey, setSelectedDayKey] = useState(() => getLocalDayKey());
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dreamFilter, setDreamFilter] = useState("all");
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [form, setForm] = useState<QuestFormModel | null>(null);

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

  const dreams = useMemo(() => goalTree.filter((node) => node.type === "dream"), [goalTree]);

  const filteredQuests = useMemo(() => {
    return quests.filter((quest) => {
      if (categoryFilter !== "all" && quest.categoryId !== categoryFilter) return false;
      if (dreamFilter !== "all") {
        const chain = getAncestorChainForQuest(goalTree, quest);
        if (!chain?.some((node) => node.id === dreamFilter)) return false;
      }
      return true;
    });
  }, [quests, categoryFilter, dreamFilter, goalTree]);

  const todayKey = useMemo(() => getLocalDayKey(), []);
  const selectedDate = useMemo(() => parseLocalDayKey(selectedDayKey), [selectedDayKey]);

  const rawMonthWeeks = useMemo(
    () => buildCalendarMonth(filteredQuests, questCompletions, cursorDate.getFullYear(), cursorDate.getMonth()),
    [filteredQuests, questCompletions, cursorDate],
  );
  const monthWeeks = useMemo(() => rawMonthWeeks.map((week) => week.map((cell) => filterCellItems(cell, statusFilter))), [rawMonthWeeks, statusFilter]);

  const rawWeekDays = useMemo(
    () => buildCalendarWeek(filteredQuests, questCompletions, view === "week" ? cursorDate : selectedDate),
    [filteredQuests, questCompletions, view, cursorDate, selectedDate],
  );
  const weekDays = useMemo(() => rawWeekDays.map((cell) => filterCellItems(cell, statusFilter)), [rawWeekDays, statusFilter]);

  const dayCell = useMemo((): CalendarDayCell => {
    const date = view === "day" ? cursorDate : selectedDate;
    return filterCellItems({ date, dayKey: getLocalDayKey(date), inCurrentPeriod: true, items: getQuestsForDate(filteredQuests, questCompletions, date) }, statusFilter);
  }, [view, cursorDate, selectedDate, filteredQuests, questCompletions, statusFilter]);

  // Selected-day panel always reflects selectedDayKey, independent of which
  // main view is active (so it stays meaningful in Month/Week too).
  const selectedCell = useMemo((): CalendarDayCell => {
    return filterCellItems({ date: selectedDate, dayKey: selectedDayKey, inCurrentPeriod: true, items: getQuestsForDate(filteredQuests, questCompletions, selectedDate) }, statusFilter);
  }, [selectedDate, selectedDayKey, filteredQuests, questCompletions, statusFilter]);

  // Quests available to manually assign to a given day - active and not yet
  // scheduled anywhere (assigning gives it a scheduledDate - see
  // isQuestUnscheduled). Deliberately uses the unfiltered quest list:
  // category/Goal filters shape what you SEE, not what you're allowed to
  // schedule.
  function getAvailableQuestsForCell(cell: CalendarDayCell): Quest[] {
    const shownIds = new Set(cell.items.map((item) => item.quest.id));
    return quests.filter((quest) => quest.status === "active" && isQuestUnscheduled(quest) && !shownIds.has(quest.id));
  }

  const miniWeeks = useMemo(
    () => rawMonthWeeks.map((week) => week.map((cell) => ({ date: cell.date, dayKey: cell.dayKey, inCurrentPeriod: cell.inCurrentPeriod, hasItems: cell.items.length > 0 }))),
    [rawMonthWeeks],
  );

  const periodLabel = useMemo(() => {
    if (view === "month") return cursorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (view === "week") return formatWeekRangeLabel(rawWeekDays);
    return cursorDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }, [view, cursorDate, rawWeekDays]);

  const selectedQuest = quests.find((quest) => quest.id === selectedQuestId) ?? null;

  function handleViewChange(next: CalendarView) {
    if (next === "day") {
      setCursorDate(selectedDate);
    }
    setView(next);
  }

  function goPrevious() {
    const next = new Date(cursorDate);
    if (view === "month") next.setMonth(next.getMonth() - 1);
    else if (view === "week") next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCursorDate(next);
    if (view === "day") setSelectedDayKey(getLocalDayKey(next));
  }

  function goNext() {
    const next = new Date(cursorDate);
    if (view === "month") next.setMonth(next.getMonth() + 1);
    else if (view === "week") next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCursorDate(next);
    if (view === "day") setSelectedDayKey(getLocalDayKey(next));
  }

  function goToday() {
    const now = new Date();
    setCursorDate(now);
    setSelectedDayKey(getLocalDayKey(now));
  }

  function selectDate(dayKey: string) {
    setSelectedDayKey(dayKey);
  }

  function shiftMiniMonth(delta: number) {
    const next = new Date(cursorDate);
    next.setMonth(next.getMonth() + delta);
    setCursorDate(next);
  }

  // All Calendar creation flows go through the one real QuestForm/
  // upsertQuestFromForm path (see quest-form.utils.ts) - the date/time are
  // just a prefill on the form model, not a separate write. Saving the form
  // is what actually schedules the quest.
  function openAddQuestForDate(date: Date) {
    setForm(createQuestFormModel({ cadence: "one-time", scheduledDate: getLocalDayKey(date) }));
  }

  function handleCreateRange(dayKey: string, startTime: string, endTime: string) {
    setForm(createQuestFormModel({ cadence: "one-time", scheduledDate: dayKey, scheduledStartTime: startTime, scheduledEndTime: endTime }));
  }

  function rescheduleQuest(questId: string, patch: QuestSchedulePatch) {
    setQuestDefinitions(quests.map((quest) => (quest.id === questId ? applyQuestSchedule(quest, patch) : quest)));
  }

  function handleAssignQuest(date: Date, questId: string) {
    rescheduleQuest(questId, { scheduledDate: getLocalDayKey(date) });
  }

  function handleClearSchedule(questId: string) {
    rescheduleQuest(questId, { scheduledDate: null, scheduledStartTime: null, scheduledEndTime: null });
  }

  function completionTimestampFor(date: Date) {
    const dayKey = getLocalDayKey(date);
    if (dayKey === todayKey) return new Date().toISOString();
    const now = new Date();
    const backdated = new Date(date);
    backdated.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    return backdated.toISOString();
  }

  function handleToggleComplete(item: CalendarQuestItem) {
    if (item.status === "completed") {
      beginUndoCompletion(item.quest.id, selectedCell.date.toISOString());
    } else {
      beginQuestCompletion(item.quest, completionTimestampFor(selectedCell.date));
    }
  }

  function saveQuest() {
    if (!form || !form.title.trim()) return;
    setQuestDefinitions(upsertQuestFromForm(quests, form));
    setForm(null);
  }

  function setQuestStatus(quest: Quest, status: QuestStatus) {
    setQuestDefinitions(quests.map((item) => (item.id === quest.id ? { ...item, status, updatedAt: new Date().toISOString() } : item)));
  }

  function deleteQuest(questId: string) {
    setQuestDefinitions(quests.filter((quest) => quest.id !== questId));
    setSelectedQuestId((current) => (current === questId ? null : current));
  }

  function linkQuestGoal(questId: string, goalId: string | null) {
    setQuestDefinitions(quests.map((item) => (item.id === questId ? { ...item, linkedProgressGoalId: goalId, updatedAt: new Date().toISOString() } : item)));
  }

  if (!isReady) {
    return (
      <Card className="p-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading Calendar...</div>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <CalendarHeader view={view} onViewChange={handleViewChange} periodLabel={periodLabel} onPrevious={goPrevious} onNext={goNext} onToday={goToday} />
        <div className="mt-4">
          <CalendarFilters
            status={statusFilter}
            onStatusChange={setStatusFilter}
            categoryId={categoryFilter}
            onCategoryChange={setCategoryFilter}
            categories={categories}
            dreamId={dreamFilter}
            onDreamChange={setDreamFilter}
            dreams={dreams}
          />
        </div>
      </Card>

      <div className={"grid gap-5 " + (selectedQuest ? "lg:grid-cols-[minmax(0,1fr)_420px]" : "xl:grid-cols-[minmax(0,1fr)_280px]")}>
        <Card className="p-5">
          {view === "month" ? <MonthView weeks={monthWeeks} todayKey={todayKey} selectedDayKey={selectedDayKey} onSelectDate={selectDate} onOpenQuest={setSelectedQuestId} /> : null}
          {view === "week" ? (
            <WeekView
              days={weekDays}
              todayKey={todayKey}
              selectedDayKey={selectedDayKey}
              onSelectDate={selectDate}
              onOpenQuest={setSelectedQuestId}
              onCreateRange={handleCreateRange}
              onReschedule={rescheduleQuest}
            />
          ) : null}
          {view === "day" ? (
            <DayView
              cell={dayCell}
              todayKey={todayKey}
              onOpenQuest={setSelectedQuestId}
              onCreateRange={handleCreateRange}
              onReschedule={rescheduleQuest}
              onAddQuest={() => openAddQuestForDate(dayCell.date)}
              availableQuests={getAvailableQuestsForCell(dayCell)}
              onAssignQuest={(questId) => handleAssignQuest(dayCell.date, questId)}
            />
          ) : null}
        </Card>

        {!selectedQuest ? (
          <div className="hidden xl:block">
            <DayPanel
              miniWeeks={miniWeeks}
              miniMonthLabel={cursorDate.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
              todayKey={todayKey}
              selectedDayKey={selectedDayKey}
              onSelectDate={selectDate}
              onPreviousMonth={() => shiftMiniMonth(-1)}
              onNextMonth={() => shiftMiniMonth(1)}
              selectedCell={selectedCell}
              onToggleComplete={handleToggleComplete}
              onOpenQuest={setSelectedQuestId}
              onAddQuest={() => openAddQuestForDate(selectedCell.date)}
              availableQuests={getAvailableQuestsForCell(selectedCell)}
              onAssignQuest={(questId) => handleAssignQuest(selectedCell.date, questId)}
              onClearSchedule={handleClearSchedule}
            />
          </div>
        ) : null}

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

      {form ? (
        <QuestForm
          form={form}
          isEditing={Boolean(form.id)}
          onChange={setForm}
          onCancel={() => setForm(null)}
          onSave={saveQuest}
        />
      ) : null}

      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          hasLinkedGoal={Boolean(pendingQuest.linkedProgressGoalId)}
          unit={pendingQuest.completionMetric?.unit}
          progressValue={progressValue}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={confirmQuestCompletion}
        />
      ) : null}

      {pendingReflectionQuest ? <QuestReflectionModal questTitle={pendingReflectionQuest.title} onSkip={skipReflection} onSubmit={submitReflection} /> : null}

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
    </div>
  );
}
