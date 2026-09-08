"use client";

import type { CalendarDayCell } from "../../_lib/engines/quest-calendar-engine";
import type { Quest } from "../../_lib/types/quest";
import QuestChip from "./QuestChip";
import AssignExistingQuestPicker from "./AssignExistingQuestPicker";

type DayViewProps = Readonly<{
  cell: CalendarDayCell;
  onOpenQuest: (questId: string) => void;
  onAddQuest: () => void;
  availableQuests: ReadonlyArray<Quest>;
  onAssignQuest: (questId: string) => void;
  onRemovePlacement: (placementId: string) => void;
}>;

export default function DayView({ cell, onOpenQuest, onAddQuest, availableQuests, onAssignQuest, onRemovePlacement }: DayViewProps) {
  const timed = cell.items.filter((item) => item.completion).sort((a, b) => (a.completion!.completedAt < b.completion!.completedAt ? -1 : 1));
  const allDay = cell.items.filter((item) => !item.completion);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">{cell.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <button type="button" onClick={onAddQuest} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
          + New Quest
        </button>
      </div>

      {cell.items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-sm text-slate-500">Nothing on the calendar for this day.</p>
      ) : (
        <>
          {allDay.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">All Day</p>
              <div className="space-y-1.5">
                {allDay.map((item) => (
                  <div key={item.quest.id} className="flex items-center gap-1.5">
                    <div className="min-w-0 flex-1">
                      <QuestChip item={item} onClick={() => onOpenQuest(item.quest.id)} />
                    </div>
                    {item.placementId ? (
                      <button
                        type="button"
                        onClick={() => onRemovePlacement(item.placementId as string)}
                        aria-label="Remove from calendar"
                        title="Remove from this day"
                        className="shrink-0 text-xs text-slate-600 transition hover:text-rose-300"
                      >
                        ✕
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {timed.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Timeline</p>
              <div className="space-y-1.5">
                {timed.map((item) => (
                  <QuestChip key={item.quest.id} item={item} onClick={() => onOpenQuest(item.quest.id)} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <AssignExistingQuestPicker availableQuests={availableQuests} onAssign={onAssignQuest} />
    </div>
  );
}
