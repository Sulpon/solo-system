"use client";

import { useAttributes } from "../../_lib/hooks/useAttributes";
import QuestIcon, { getQuestIconKey } from "../quests/QuestIcon";
import type { CalendarQuestItem } from "../../_lib/engines/quest-calendar-engine";
import { formatTimeLabel } from "../../_lib/calendar-time";

const STATUS_STYLE: Record<CalendarQuestItem["status"], string> = {
  completed: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100",
  missed: "border-rose-400/30 bg-rose-500/5 text-rose-200/80",
  scheduled: "border-slate-700 bg-slate-900/70 text-slate-200",
};

type QuestChipProps = Readonly<{
  item: CalendarQuestItem;
  onClick: () => void;
  compact?: boolean;
  // MonthView's grid stays 7-columns-wide even on mobile, so its chips have
  // no room for title text there - WeekView/DayView/DayPanel have full-width
  // rows on mobile and should always show the title.
  iconOnlyBelowSm?: boolean;
}>;

export default function QuestChip({ item, onClick, compact = false, iconOnlyBelowSm = false }: QuestChipProps) {
  const { attributes: categories } = useAttributes();
  const category = categories.find((entry) => entry.id === item.quest.categoryId);
  const iconKey = getQuestIconKey(item.quest.title);
  // A quest's own scheduled start time always wins (a completed quest stays
  // at its scheduled slot); fall back to the real completion time only for
  // an all-day item with no schedule of its own, where it's still useful
  // info.
  const time = item.startTime
    ? formatTimeLabel(item.startTime)
    : item.completion
      ? new Date(item.completion.completedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
      : null;

  return (
    <button
      type="button"
      onClick={(event) => {
        // MonthView nests this inside a clickable day cell - stop the click
        // from also selecting the day underneath.
        event.stopPropagation();
        onClick();
      }}
      title={item.quest.title}
      className={
        "flex w-full items-center gap-1.5 rounded-lg border px-2 py-1 text-left text-[11px] font-semibold transition hover:brightness-110 " +
        (iconOnlyBelowSm ? "justify-center px-1 sm:justify-start sm:px-2 " : "") +
        STATUS_STYLE[item.status] +
        (compact ? "" : " py-1.5")
      }
    >
      <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + (category?.accent ?? "bg-slate-500")} />
      <QuestIcon iconKey={iconKey} className="h-3 w-3 shrink-0" />
      {/* MonthView's grid stays cramped on mobile - the icon+category dot
          still identifies the quest there, and tapping the day reveals the
          full title in the Day Panel. Every other view has room to always
          show it. */}
      <span className={"min-w-0 truncate " + (iconOnlyBelowSm ? "hidden sm:inline " : "") + (item.status === "completed" ? "line-through decoration-emerald-400/60" : "")}>{item.quest.title}</span>
      {time ? <span className={"ml-auto shrink-0 text-[10px] font-normal text-slate-500 " + (iconOnlyBelowSm ? "hidden sm:inline" : "")}>{time}</span> : null}
    </button>
  );
}
