"use client";

import FocusButton from "../../focus/FocusButton";
import { categories } from "../../../_lib/mock/categories";
import type { Quest } from "../../../_lib/types/quest";

type QuestLineProps = Readonly<{
  quest: Quest;
  completed: boolean;
  onToggle: () => void;
  onEdit: () => void;
}>;

function categoryName(categoryId: Quest["categoryId"]) {
  return categories.find((category) => category.id === categoryId)?.name ?? categoryId;
}

// A daily quest inside its parent dungeon.
//
// This is a presentation of the EXISTING Quest - there is no separate task
// model here. Completion goes through the same progression-store mutation
// the Quests page and dashboard use, so XP, streaks, mastery and activity
// events all fire exactly once, through the one code path. Focus reuses
// FocusButton, which already derives the goal/dream chain from
// linkedProgressGoalId on its own.
//
// Estimated duration is not rendered: Quest carries no duration field, and
// inventing one would be a fabricated statistic.
export default function QuestLine({ quest, completed, onToggle, onEdit }: QuestLineProps) {
  return (
    <div className={"flex items-center gap-3 rounded-lg border px-3 py-2 transition " + (completed ? "border-white/15 bg-white/[0.06]" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.045]")}>
      <input
        type="checkbox"
        checked={completed}
        onChange={onToggle}
        aria-label={`Mark ${quest.title} complete`}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-white/25 bg-transparent accent-[rgb(var(--atlas-accent,168_85_247))]"
      />

      <button type="button" onClick={onEdit} className="min-w-0 flex-1 text-left">
        <span className={"block truncate text-sm " + (completed ? "text-white/55 line-through" : "text-white")}>{quest.title}</span>
        <span className="atlas-muted block truncate text-[0.68rem]">{categoryName(quest.categoryId)}</span>
      </button>

      <span className="atlas-accent shrink-0 text-xs font-semibold">+{quest.xp} XP</span>

      <FocusButton quest={{ id: quest.id, title: quest.title, linkedProgressGoalId: quest.linkedProgressGoalId }} compact />
    </div>
  );
}
