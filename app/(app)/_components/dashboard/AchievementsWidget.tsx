"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import { useRewardCollection } from "../../_lib/hooks/useRewardCollection";
import { useManualAchievements } from "../../_lib/hooks/useManualAchievements";
import { useDashboardPreferences } from "../../_lib/hooks/useDashboardPreferences";
import { getAchievementCandidates, getDefaultSelectedAchievementIds } from "../../_lib/engines/dashboard-personalization-engine";
import ManageAchievementsModal from "./ManageAchievementsModal";

const ICON_GLYPHS: Record<string, string> = { trophy: "🏆", star: "⭐", flame: "🔥", medal: "🥇", crown: "👑", target: "🎯", book: "📖", heart: "❤️" };

// A view over the real reward collection (types/reward.ts) - every entry
// with reward.type === "achievement" is already a verified Atlas milestone
// (see useProgressionEventSync.ts), plus any manual achievements the user
// added. No achievement is invented here.
export default function AchievementsWidget() {
  const { rewardCollection } = useRewardCollection();
  const { manualAchievements, addManualAchievement, deleteManualAchievement } = useManualAchievements();
  const { preferences, setSelectedAchievementIds } = useDashboardPreferences();
  const [managing, setManaging] = useState(false);

  const candidates = useMemo(() => getAchievementCandidates(rewardCollection, manualAchievements), [rewardCollection, manualAchievements]);
  const candidatesById = useMemo(() => new Map(candidates.map((candidate) => [candidate.id, candidate])), [candidates]);
  const selectedIds = preferences.selectedAchievementIds ?? getDefaultSelectedAchievementIds(candidates);
  const visible = selectedIds.map((id) => candidatesById.get(id)).filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate));

  return (
    <Card className="p-5" testId="dashboard-achievements-widget">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.1em] text-white">🏆 Achievements</p>
        <button type="button" onClick={() => setManaging(true)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-amber-400/60 hover:text-white">
          ⚙ Manage
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {visible.length === 0 ? (
          <p className="text-sm text-slate-500">No achievements selected yet. Manage to pin your unlocks here.</p>
        ) : (
          visible.map((achievement) => (
            <div key={achievement.id} className="flex items-center gap-2.5 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
              <span>{achievement.source === "manual" ? ICON_GLYPHS[achievement.icon ?? "trophy"] : "🏆"}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{achievement.title}</span>
            </div>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => setManaging(true)}
        className="mt-3 w-full rounded-lg border border-dashed border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-amber-400/50 hover:text-white"
      >
        + Add Achievement
      </button>

      {managing ? (
        <ManageAchievementsModal
          candidates={candidates}
          selectedIds={selectedIds}
          onSave={setSelectedAchievementIds}
          onAddManualAchievement={addManualAchievement}
          onDeleteManualAchievement={deleteManualAchievement}
          onClose={() => setManaging(false)}
        />
      ) : null}
    </Card>
  );
}
