"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import Progress from "../Progress";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useDashboardPreferences } from "../../_lib/hooks/useDashboardPreferences";
import { calculateGoalTree, findGoalNodeView } from "../../_lib/goal-tree-progress";
import { getDefaultSelectedGoalIds } from "../../_lib/engines/dashboard-personalization-engine";
import ManageGoalsModal from "./ManageGoalsModal";

// A view over the real Goal Tree - progress always comes from
// calculateGoalTree/findGoalNodeView (goal-tree-progress.ts), the same
// derivation QuestLinkedGoals already uses. selectedGoalIds is the only
// thing this widget persists; if a selected Goal was deleted, its id simply
// resolves to nothing and is skipped here - never a crash, never a phantom
// Goal, and the stale id itself is left alone (Manage Goals shows it's no
// longer selectable rather than Dashboard silently rewriting preferences).
export default function GoalProgressWidget() {
  const { goalTree } = useGoalTree();
  const { preferences, setSelectedGoalIds } = useDashboardPreferences();
  const [managing, setManaging] = useState(false);

  const goalTreeView = useMemo(() => calculateGoalTree(goalTree), [goalTree]);
  const selectedIds = preferences.selectedGoalIds ?? getDefaultSelectedGoalIds(goalTree);
  const visibleGoals = selectedIds.map((id) => findGoalNodeView(goalTreeView, id)).filter((node): node is NonNullable<typeof node> => Boolean(node));

  return (
    // Modal is a sibling of Card, not a child - see StreaksWidget.tsx for
    // why (Card's backdrop-blur-xl traps position:fixed descendants inside
    // the card's own box instead of the viewport).
    <>
      <Card className="p-5" testId="dashboard-goal-progress-widget">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black uppercase tracking-[0.1em] text-white">Goal Progress</p>
          <button type="button" onClick={() => setManaging(true)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/60 hover:text-white">
            ⚙ Manage
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {visibleGoals.length === 0 ? (
            <p className="text-sm text-slate-500">No goals selected yet. Manage to choose which Goals appear here.</p>
          ) : (
            visibleGoals.map((goal) => (
              <div key={goal.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-slate-200">{goal.title}</span>
                  <span className="shrink-0 font-semibold text-cyan-300">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-900" fillClassName="h-full bg-gradient-to-r from-cyan-400 to-purple-400" />
              </div>
            ))
          )}
        </div>
      </Card>

      {managing ? <ManageGoalsModal goalTree={goalTree} selectedIds={selectedIds} onSave={setSelectedGoalIds} onClose={() => setManaging(false)} /> : null}
    </>
  );
}
