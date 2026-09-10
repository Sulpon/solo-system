"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import QuestList from "./QuestList";
import type { Quest, QuestCompletion } from "../../_lib/types/quest";

type QuestKindSectionProps = Readonly<{
  // Droppable id - QuestManagerPage's onDragEnd reads this back off
  // `over.id` to decide the new Quest.kind. Not a storage key of its own.
  id: string;
  title: string;
  icon: string;
  accentBorderClass: string;
  accentTextClass: string;
  emptyHint: string;
  quests: Quest[];
  questCompletions: ReadonlyArray<QuestCompletion>;
  completedTodayIds: ReadonlySet<string>;
  referenceDate: Date;
  onEdit: (quest: Quest) => void;
  onToggleStatus: (quest: Quest) => void;
  onDelete: (questId: string) => void;
  onComplete: (quest: Quest) => void;
  onUndoComplete: (quest: Quest) => void;
  onStartWorkout: (quest: Quest) => void;
  onSelect: (quest: Quest) => void;
  selectedQuestId: string | null;
  // Opt-in inline rename affordance (used by the Eisenhower quadrant
  // sections, which have user-customizable display names - see
  // useEisenhowerSettings.ts). Omitted entirely for Tasks/Habits, which
  // have fixed titles - no rename UI renders when this is absent.
  onRenameTitle?: (nextTitle: string) => void;
}>;

// A drop target for reclassifying an existing Quest's `kind` - see
// QuestManagerPage.tsx's onDragEnd, the only place that actually writes the
// change (a plain array update through the same setQuestDefinitions every
// other Quest Manager mutation already uses). This component only renders
// the zone and reports hover state; it never touches Quest data itself.
export default function QuestKindSection({
  id,
  title,
  icon,
  accentBorderClass,
  accentTextClass,
  emptyHint,
  quests,
  questCompletions,
  completedTodayIds,
  referenceDate,
  onEdit,
  onToggleStatus,
  onDelete,
  onComplete,
  onUndoComplete,
  onStartWorkout,
  onSelect,
  selectedQuestId,
  onRenameTitle,
}: QuestKindSectionProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState(title);

  function startRename() {
    setDraftTitle(title);
    setIsRenaming(true);
  }

  function commitRename() {
    const trimmed = draftTitle.trim();

    if (trimmed && trimmed !== title) {
      onRenameTitle?.(trimmed);
    }

    setIsRenaming(false);
  }

  return (
    <div
      ref={setNodeRef}
      data-testid={id}
      className={"rounded-2xl border-2 border-dashed p-3 transition-colors duration-150 " + (isOver ? accentBorderClass + " bg-slate-900/60" : "border-slate-800/80 bg-slate-950/20")}
    >
      <div className="flex items-center gap-2 px-1">
        <span className="text-base leading-none">{icon}</span>
        {isRenaming ? (
          <input
            autoFocus
            value={draftTitle}
            onChange={(event) => setDraftTitle(event.target.value)}
            onBlur={commitRename}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitRename();
              } else if (event.key === "Escape") {
                setIsRenaming(false);
              }
            }}
            aria-label={`Rename ${title}`}
            className="rounded-md border border-purple-400/50 bg-slate-950/80 px-2 py-0.5 text-sm font-black uppercase tracking-[0.14em] text-white outline-none"
          />
        ) : (
          <h3 className={"text-sm font-black uppercase tracking-[0.14em] " + (isOver ? accentTextClass : "text-white")}>{title}</h3>
        )}
        <span className="text-xs text-slate-500">{quests.length}</span>
        {onRenameTitle && !isRenaming ? (
          <button type="button" onClick={startRename} aria-label={`Rename ${title}`} className="ml-auto text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 transition hover:text-white">
            Rename
          </button>
        ) : null}
      </div>

      {quests.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/30 p-4 text-center text-xs text-slate-500">
          {isOver ? "Release to drop here" : emptyHint}
        </p>
      ) : (
        <QuestList
          quests={quests}
          questCompletions={questCompletions}
          completedTodayIds={completedTodayIds}
          referenceDate={referenceDate}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onDelete={onDelete}
          onComplete={onComplete}
          onUndoComplete={onUndoComplete}
          onStartWorkout={onStartWorkout}
          onSelect={onSelect}
          selectedQuestId={selectedQuestId}
          draggable
        />
      )}
    </div>
  );
}
