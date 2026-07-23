"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import CustomizablePage from "../page-edit/CustomizablePage";
import { getCatalogWidgetsForPage } from "../../_lib/widgets/catalog-registry";
import { QuestStatsCard, StatNumberCard } from "../page-edit/StatWidgets";
import { isQuestScheduledForDate } from "../../_lib/daily-system";
import { hasCompletedToday } from "../../_lib/quest-storage";
import { getLocalDayKey, parseLocalDayKey } from "../../_lib/local-day";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useWorkout } from "../../_lib/workout-store";
import type { Quest, QuestStatus } from "../../_lib/types/quest";
import QuestForm, { type QuestFormModel } from "./QuestForm";
import QuestCompletionModal from "./QuestCompletionModal";
import QuestList from "./QuestList";
import { useQuestCompletionFlow } from "./useQuestCompletionFlow";
import { createQuestFormModel, toQuestForm, upsertQuestFromForm } from "./quest-form.utils";
import type { EditablePageSection } from "../page-edit/types";

type QuestManagerPageProps = Readonly<{}>;
type QuestImportanceFilter = "all" | "today" | "core" | "bonus";

export default function QuestManagerPage({}: QuestManagerPageProps) {
  const [form, setForm] = useState<QuestFormModel | null>(null);
  const [importanceFilter, setImportanceFilter] = useState<QuestImportanceFilter>("all");
  const [logDayKey, setLogDayKey] = useState(() => getLocalDayKey());
  const { isReady, questDefinitions: quests, setQuestDefinitions, questCompletions, activityEvents, progressionSummary } = useProgression();
  const { startSession: startWorkoutSession } = useWorkout();
  const availableWidgets = useMemo(() => getCatalogWidgetsForPage("quests"), []);
  const {
    pendingQuest,
    pendingGoal,
    progressValue,
    setProgressValue,
    beginQuestCompletion,
    confirmQuestCompletion,
    cancelQuestCompletion,
    removeQuestCompletion,
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

  function deleteQuest(questId: string) {
    const nextQuests = quests.filter((quest) => quest.id !== questId);
    setQuestDefinitions(nextQuests);
  }

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
      <CustomizablePage pageId="quests" title="Quest Widgets" subtitle="Read-only quest statistics and progress panels." sections={statsSections} availableWidgets={availableWidgets} />

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
        <QuestList
          quests={sortedQuests}
          questCompletions={questCompletions}
          completedTodayIds={completedForLogDayIds}
          referenceDate={logDate}
          onEdit={(quest) => setForm(toQuestForm(quest))}
          onToggleStatus={(quest) => setQuestStatus(quest, quest.status === "active" ? "archived" : "active")}
          onDelete={deleteQuest}
          onComplete={(quest) => beginQuestCompletion(quest, completionTimestampForLogDay())}
          onUndoComplete={(quest) => removeQuestCompletion(quest.id, logDate.toISOString())}
          onStartWorkout={(quest) => startWorkoutSession({ templateId: quest.linkedWorkoutTemplateId, linkedQuestId: quest.id })}
        />
      )}

      {form ? <QuestForm form={form} isEditing={Boolean(form.id)} onChange={setForm} onCancel={() => setForm(null)} onSave={saveQuest} /> : null}

      {pendingQuest ? (
        <QuestCompletionModal
          questTitle={pendingQuest.title}
          goal={pendingGoal}
          progressValue={progressValue}
          logDateLabel={isLoggingPastDay ? logDayKey : undefined}
          onChange={setProgressValue}
          onCancel={cancelQuestCompletion}
          onConfirm={confirmQuestCompletion}
        />
      ) : null}
      </Card>
    </div>
  );
}
