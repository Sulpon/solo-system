"use client";

import { useNotes } from "../../_lib/hooks/useNotes";
import { useLibrary } from "../../_lib/hooks/useLibrary";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useFocusHistory } from "../../_lib/hooks/useFocusHistory";
import { getQuestRelationships } from "../../_lib/relationships";
import RelatedEntitiesPanel from "../relationships/RelatedEntitiesPanel";
import type { GoalTree } from "../../_lib/types/goal-tree";
import type { Quest } from "../../_lib/types/quest";

type QuestRelationshipsPanelProps = Readonly<{ quest: Quest; goalTree: GoalTree }>;

// Self-contained, like QuestLinkedGoals/QuestPlanningPath (its siblings in
// this same detail panel) - fetches its own data via the same real hooks
// rather than being threaded extra props from QuestDetailPanel/
// QuestManagerPage.
export default function QuestRelationshipsPanel({ quest, goalTree }: QuestRelationshipsPanelProps) {
  const { notes } = useNotes();
  const { items: libraryItems } = useLibrary();
  const { attributes } = useAttributes();
  const { history: focusHistory } = useFocusHistory();

  const groups = getQuestRelationships(quest, goalTree, notes, libraryItems, attributes, focusHistory);

  return (
    <div className="px-5 pb-5">
      <RelatedEntitiesPanel groups={groups} />
    </div>
  );
}
