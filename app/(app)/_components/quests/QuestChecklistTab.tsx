"use client";

import ChecklistEditor from "./ChecklistEditor";
import type { ChecklistItem, ChecklistMode, Quest } from "../../_lib/types/quest";

type QuestChecklistTabProps = Readonly<{
  quest: Quest;
  onUpdate: (questId: string, patch: Readonly<{ checklistMode?: ChecklistMode; checklist?: ReadonlyArray<ChecklistItem>; checklistTemplateId?: string | null }>) => void;
}>;

// Thin persistence wiring over the real editor (ChecklistEditor.tsx, also
// reused by QuestForm.tsx's create/edit modal) - every edit here writes
// straight to the real Quest via onUpdate, exactly as before this was
// extracted.
export default function QuestChecklistTab({ quest, onUpdate }: QuestChecklistTabProps) {
  return (
    <ChecklistEditor
      mode={quest.checklistMode ?? "none"}
      checklist={quest.checklist ?? []}
      checklistTemplateId={quest.checklistTemplateId}
      onUpdate={(patch) => onUpdate(quest.id, patch)}
    />
  );
}
