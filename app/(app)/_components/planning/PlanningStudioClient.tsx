"use client";

import { useState } from "react";
import Link from "next/link";
import ThemeHeader from "../theme/ThemeHeader";
import QuestForm, { type QuestFormModel } from "../quests/QuestForm";
import { createQuestFormModel, toQuestForm, upsertQuestFromForm } from "../quests/quest-form.utils";
import { useProgression } from "../../_lib/hooks/useProgression";
import DailyStudioView from "./DailyStudioView";
import PlanningPageClient from "./PlanningPageClient";

type StudioView = "daily" | "quarter";

// Only views that actually do something. Calendar is a real route and is
// linked rather than re-implemented here; Board, Routine and Time Analysis
// are not built yet and deliberately have no button, because a tab that
// opens nothing is worse than a tab that is not there.
const STUDIO_VIEWS: ReadonlyArray<{ id: StudioView; label: string }> = [
  { id: "daily", label: "Daily" },
  { id: "quarter", label: "Quarter" },
];

// Planning Studio. Daily is the landing view: the question on opening
// Atlas is "what am I doing now", not "what is my quarterly plan".
//
// The quarterly planner underneath is the existing PlanningPageClient,
// mounted unchanged - this adds a way in, it does not replace it.
export default function PlanningStudioClient() {
  const { questDefinitions, setQuestDefinitions } = useProgression();
  const [view, setView] = useState<StudioView>("daily");
  const [questForm, setQuestForm] = useState<QuestFormModel | null>(null);

  function openQuest(questId: string) {
    const quest = questDefinitions.find((entry) => entry.id === questId);

    if (quest) {
      setQuestForm(toQuestForm(quest));
    }
  }

  // A drag on the timeline arrives here as a real range, so the new quest
  // opens already scheduled for the slot that was drawn.
  function addQuest(dayKey: string, startTime?: string, endTime?: string) {
    setQuestForm(createQuestFormModel({ scheduledDate: dayKey, scheduledStartTime: startTime, scheduledEndTime: endTime }));
  }

  function saveQuest() {
    if (!questForm || !questForm.title.trim()) {
      return;
    }

    setQuestDefinitions(upsertQuestFromForm(questDefinitions, questForm));
    setQuestForm(null);
  }

  return (
    <div className="space-y-5">
      <ThemeHeader
        title="Planning Studio"
        subtitle="Run the day, then shape the quarter."
        actions={
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-white/10 p-1">
            {STUDIO_VIEWS.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setView(entry.id)}
                aria-pressed={view === entry.id}
                data-testid={`studio-view-${entry.id}`}
                className={
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition " +
                  (view === entry.id ? "atlas-accent bg-[rgb(var(--atlas-accent,168_85_247)/0.14)]" : "atlas-muted hover:text-white")
                }
              >
                {entry.label}
              </button>
            ))}
            <Link href="/calendar" className="atlas-muted rounded-lg px-3 py-1.5 text-xs font-semibold transition hover:text-white">
              Calendar
            </Link>
          </div>
        }
      />

      {view === "daily" ? <DailyStudioView onOpenQuest={openQuest} onAddQuest={addQuest} /> : <PlanningPageClient />}

      {questForm ? (
        <QuestForm form={questForm} isEditing={Boolean(questForm.id)} onChange={setQuestForm} onCancel={() => setQuestForm(null)} onSave={saveQuest} />
      ) : null}
    </div>
  );
}
