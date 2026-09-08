"use client";

import type { CalendarDayCell } from "../../_lib/engines/quest-calendar-engine";
import QuestChip from "./QuestChip";

type DayViewProps = Readonly<{
  cell: CalendarDayCell;
  onOpenQuest: (questId: string) => void;
  onAddQuest: () => void;
}>;

export default function DayView({ cell, onOpenQuest, onAddQuest }: DayViewProps) {
  const timed = cell.items.filter((item) => item.completion).sort((a, b) => (a.completion!.completedAt < b.completion!.completedAt ? -1 : 1));
  const allDay = cell.items.filter((item) => !item.completion);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-white">{cell.date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
        <button type="button" onClick={onAddQuest} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
          + Add Quest
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
                  <QuestChip key={item.quest.id} item={item} onClick={() => onOpenQuest(item.quest.id)} />
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
    </div>
  );
}
