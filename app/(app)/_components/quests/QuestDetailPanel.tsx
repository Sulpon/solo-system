"use client";

import { useState } from "react";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { calculateQuestStreak } from "../../_lib/daily-system";
import { getQuestDetailStats } from "../../_lib/engines/quest-calendar-engine";
import { formatSchedule } from "./QuestList";
import QuestDetailHeader from "./QuestDetailHeader";
import QuestDetailTabs, { type QuestDetailTab } from "./QuestDetailTabs";
import QuestCalendar from "./QuestCalendar";
import QuestStatistics from "./QuestStatistics";
import QuestLinkedGoals from "./QuestLinkedGoals";
import QuestRecentActivity from "./QuestRecentActivity";
import type { GoalNode, GoalTree } from "../../_lib/types/goal-tree";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type QuestDetailPanelProps = Readonly<{
  quest: Quest;
  completions: ReadonlyArray<QuestCompletion>;
  goalTree: GoalTree;
  progressGoals: ReadonlyArray<GoalNode>;
  onClose: () => void;
  onEdit: (quest: Quest) => void;
  onToggleStatus: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onLinkGoal: (questId: string, goalId: string | null) => void;
}>;

const labelClass = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

function OverviewTab({ quest, completions }: Readonly<{ quest: Quest; completions: ReadonlyArray<QuestCompletion> }>) {
  const { attributes: categories } = useAttributes();
  const categoryName = categories.find((category) => category.id === quest.categoryId)?.name ?? quest.categoryId;
  const stats = getQuestDetailStats(quest, completions);
  const createdLabel = new Date(quest.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-5">
      <div>
        <p className={labelClass}>Description</p>
        <p className="mt-1.5 text-sm leading-6 text-slate-300">{quest.description?.trim() || "No description yet."}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <p className={labelClass}>Category</p>
          <p className="mt-1 text-sm font-semibold text-white">{categoryName}</p>
        </div>
        <div>
          <p className={labelClass}>Frequency</p>
          <p className="mt-1 text-sm font-semibold text-white">{formatSchedule(quest)}</p>
        </div>
        <div>
          <p className={labelClass}>XP Reward</p>
          <p className="mt-1 text-sm font-semibold text-purple-200">+{quest.xp} XP</p>
        </div>
        <div>
          <p className={labelClass}>Created</p>
          <p className="mt-1 text-sm font-semibold text-white">{createdLabel}</p>
        </div>
        <div>
          <p className={labelClass}>Current Streak</p>
          <p className="mt-1 text-sm font-semibold text-orange-300">{calculateQuestStreak(quest, completions)} days</p>
        </div>
        <div>
          <p className={labelClass}>Total Completions</p>
          <p className="mt-1 text-sm font-semibold text-cyan-300">{stats.totalCompletions}</p>
        </div>
      </div>

      <div>
        <p className={labelClass + " mb-2"}>Recent Activity</p>
        <QuestRecentActivity quest={quest} completions={completions} />
      </div>
    </div>
  );
}

export default function QuestDetailPanel({ quest, completions, goalTree, progressGoals, onClose, onEdit, onToggleStatus, onDelete, onLinkGoal }: QuestDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<QuestDetailTab>("calendar");

  return (
    <div className="overflow-hidden rounded-2xl border border-purple-500/20 bg-slate-950/70">
      <QuestDetailHeader quest={quest} completions={completions} onClose={onClose} onEdit={onEdit} onToggleStatus={onToggleStatus} onDelete={onDelete} />
      <QuestDetailTabs activeTab={activeTab} onChange={setActiveTab} />

      <div className="p-5">
        {activeTab === "overview" ? <OverviewTab quest={quest} completions={completions} /> : null}
        {activeTab === "calendar" ? <QuestCalendar quest={quest} completions={completions} /> : null}
        {activeTab === "statistics" ? <QuestStatistics quest={quest} completions={completions} /> : null}
        {activeTab === "notes" ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center">
            <p className="text-sm font-semibold text-white">Quest Notes</p>
            <p className="mt-1.5 text-xs text-slate-500">Nothing here yet. Quest-linked notes are coming soon.</p>
          </div>
        ) : null}
      </div>

      <QuestLinkedGoals quest={quest} goalTree={goalTree} progressGoals={progressGoals} onLinkGoal={(goalId) => onLinkGoal(quest.id, goalId)} />
    </div>
  );
}
