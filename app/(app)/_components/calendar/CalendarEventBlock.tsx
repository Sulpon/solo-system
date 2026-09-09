"use client";

import { useAttributes } from "../../_lib/hooks/useAttributes";
import QuestIcon, { getQuestIconKey } from "../quests/QuestIcon";
import type { CalendarQuestItem } from "../../_lib/engines/quest-calendar-engine";
import { formatTimeLabel } from "../../_lib/calendar-time";

const STATUS_STYLE: Record<CalendarQuestItem["status"], string> = {
  completed: "border-emerald-400/50 bg-emerald-500/15 text-emerald-100",
  missed: "border-rose-400/40 bg-rose-500/10 text-rose-200/90",
  scheduled: "border-purple-400/40 bg-purple-500/15 text-purple-50",
};

type CalendarEventBlockProps = Readonly<{
  item: CalendarQuestItem;
  top: number;
  height: number;
  onPointerDownMove: (event: React.PointerEvent) => void;
  onPointerDownResize: (event: React.PointerEvent) => void;
}>;

// A positioned time-grid block - distinct from QuestChip (which is a plain
// row/pill used in All Day rows and Month view, with no absolute positioning
// or drag/resize affordances). Dragging vs. opening the Quest Detail Panel
// is disambiguated centrally in CalendarTimeGrid (a near-zero-movement
// pointer down/up counts as a click), so this component only reports raw
// pointer-down events upward - it has no onClick of its own.
export default function CalendarEventBlock({ item, top, height, onPointerDownMove, onPointerDownResize }: CalendarEventBlockProps) {
  const { attributes: categories } = useAttributes();
  const category = categories.find((entry) => entry.id === item.quest.categoryId);
  const iconKey = getQuestIconKey(item.quest.title);
  const compact = height < 40;

  return (
    <div
      data-calendar-block="true"
      onPointerDown={(event) => {
        event.preventDefault();
        onPointerDownMove(event);
      }}
      title={item.quest.title}
      style={{ top, height, touchAction: "none" }}
      className={
        "absolute inset-x-0.5 select-none overflow-hidden rounded-lg border px-1.5 py-1 text-left text-[11px] font-semibold shadow-sm transition hover:brightness-110 " +
        STATUS_STYLE[item.status] +
        (item.isRecurring ? " border-dashed" : "")
      }
    >
      <div className="flex items-center gap-1">
        <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + (category?.accent ?? "bg-slate-500")} />
        <QuestIcon iconKey={iconKey} className="h-3 w-3 shrink-0" />
        <span className={"min-w-0 truncate " + (item.status === "completed" ? "line-through decoration-emerald-400/60" : "")}>{item.quest.title}</span>
      </div>
      {!compact && item.startTime ? (
        <p className="mt-0.5 truncate text-[10px] font-normal opacity-80">
          {formatTimeLabel(item.startTime)}
          {item.endTime ? ` – ${formatTimeLabel(item.endTime)}` : ""}
        </p>
      ) : null}

      <div
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onPointerDownResize(event);
        }}
        style={{ touchAction: "none" }}
        className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
      />
    </div>
  );
}
