"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useManualStreaks } from "../../_lib/hooks/useManualStreaks";
import { useDashboardPreferences } from "../../_lib/hooks/useDashboardPreferences";
import { getDefaultSelectedStreakIds, getStreakCandidates } from "../../_lib/engines/dashboard-personalization-engine";
import ManageStreaksModal from "./ManageStreaksModal";

// A view over real streak data only - see getStreakCandidates, which reuses
// daily-system.ts's calculateQuestStreak (CURRENT streak, not best) for real
// Quests, plus any manual streaks the user created. Nothing here calculates
// a streak itself.
export default function StreaksWidget() {
  const { questDefinitions, questCompletions } = useProgression();
  const { manualStreaks, addManualStreak, incrementManualStreak, deleteManualStreak } = useManualStreaks();
  const { preferences, setSelectedStreakIds } = useDashboardPreferences();
  const [managing, setManaging] = useState(false);

  const candidates = useMemo(() => getStreakCandidates(questDefinitions, questCompletions, manualStreaks), [questDefinitions, questCompletions, manualStreaks]);
  const candidatesById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const selectedIds = preferences.selectedStreakIds ?? getDefaultSelectedStreakIds(candidates);
  const visible = selectedIds.map((id) => candidatesById.get(id)).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  return (
    <Card className="p-5" testId="dashboard-streaks-widget">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.1em] text-white">🔥 Streaks</p>
        <button type="button" onClick={() => setManaging(true)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-orange-400/60 hover:text-white">
          ⚙ Manage
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No streaks selected yet. Manage to pin your current streaks here.</p>
        ) : (
          visible.map((streak) => (
            <div key={streak.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
              <span className="min-w-0 truncate text-sm text-slate-300">{streak.title}</span>
              <span className="shrink-0 text-sm font-bold text-orange-300">
                🔥 {streak.currentStreak.toLocaleString()} {streak.currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setManaging(true)}
        className="mt-3 w-full rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-orange-400/50 hover:text-white"
      >
        + Add Streak
      </button>

      {managing ? (
        <ManageStreaksModal
          candidates={candidates}
          selectedIds={selectedIds}
          onSave={setSelectedStreakIds}
          onAddManualStreak={addManualStreak}
          onIncrementManualStreak={incrementManualStreak}
          onDeleteManualStreak={deleteManualStreak}
          onClose={() => setManaging(false)}
        />
      ) : null}
    </Card>
  );
}
