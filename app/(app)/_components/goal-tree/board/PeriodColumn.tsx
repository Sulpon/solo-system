"use client";

import { Target } from "lucide-react";
import { getColumnStats, type BoardColumn } from "../../../_lib/engines/period-board";
import { HIERARCHY_LEVELS } from "../hierarchy/hierarchy-levels";
import type { GoalNode } from "../../../_lib/types/goal-tree";
import type { CalendarQuestItem } from "../../../_lib/engines/quest-calendar-engine";

type PeriodColumnProps = Readonly<{
  column: BoardColumn;
  nodes: ReadonlyArray<GoalNode>;
  // Day columns only - a day-level objective in Atlas is a Quest.
  quests: ReadonlyArray<CalendarQuestItem>;
  // Null when this level cannot accept a new entry yet, with the reason to
  // show instead of a dead "+" button.
  addBlockedReason: string | null;
  onAdd: () => void;
  onSelectNode: (node: GoalNode) => void;
}>;

function ObjectiveRow({ title, meta, progress, complete, accentFill, onClick }: Readonly<{
  title: string;
  meta?: string;
  progress: number;
  complete: boolean;
  accentFill: string;
  onClick?: () => void;
}>) {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)));

  const body = (
    <>
      <div className="flex items-start gap-2">
        <span className={"mt-1 h-3 w-3 shrink-0 rounded-full border " + (complete ? accentFill + " border-transparent" : "border-white/25")} aria-hidden />
        <span className={"min-w-0 flex-1 text-sm " + (complete ? "text-white/55 line-through" : "text-white")}>{title}</span>
        <span className="atlas-muted shrink-0 text-[0.68rem]">{clamped}%</span>
      </div>
      {meta ? <p className="atlas-muted mt-1 pl-5 text-[0.66rem]">{meta}</p> : null}
      <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
        <div className={"h-full rounded-full " + accentFill} style={{ width: `${clamped}%` }} />
      </div>
    </>
  );

  if (!onClick) {
    return <div className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5">{body}</div>;
  }

  return (
    <button type="button" onClick={onClick} className="w-full rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5 text-left transition hover:bg-white/[0.05]">
      {body}
    </button>
  );
}

// One period of the board. Shows only what Atlas actually stores: how many
// objectives sit in this period and how far they have come. Deliberately no
// planned/spent hours - Atlas records no time estimate per goal, so those
// figures would be invented.
export default function PeriodColumn({ column, nodes, quests, addBlockedReason, onAdd, onSelectNode }: PeriodColumnProps) {
  const isDay = column.periodType === "day";
  const level = HIERARCHY_LEVELS[isDay ? "day" : column.periodType];
  const stats = getColumnStats(nodes);

  const completedQuests = quests.filter((item) => item.status === "completed").length;
  const total = isDay ? quests.length : stats.total;
  const completed = isDay ? completedQuests : stats.completed;

  return (
    <section
      data-testid={`board-column-${column.id}`}
      className={
        "flex w-[260px] shrink-0 flex-col rounded-2xl border p-3 sm:w-[280px] " +
        (column.isCurrent ? level.accentBorder + " " + level.accentWash : "border-white/[0.07] bg-white/[0.015]")
      }
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className={"atlas-display truncate text-sm font-bold " + (column.isCurrent ? "text-white" : "text-white/80")}>{column.title}</h3>
          <p className={"mt-0.5 truncate text-[0.62rem] uppercase tracking-[0.18em] " + level.accentText}>{column.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={Boolean(addBlockedReason)}
          title={addBlockedReason ?? "Add"}
          aria-label={`Add to ${column.title}`}
          className="atlas-muted shrink-0 rounded-md border border-white/10 px-2 py-0.5 text-sm leading-none transition hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          +
        </button>
      </header>

      <div className="mt-2.5 flex items-center justify-between rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1.5">
        <span className="atlas-muted text-[0.68rem]">
          {completed}/{total} done
        </span>
        {total > 0 ? <span className="atlas-muted text-[0.68rem]">{isDay ? `${quests.length} quest${quests.length === 1 ? "" : "s"}` : `${stats.progress}%`}</span> : null}
      </div>

      <div className="mt-2.5 flex-1 space-y-2">
        {isDay
          ? quests.map((item) => (
              <ObjectiveRow
                key={item.quest.id}
                title={item.quest.title}
                meta={item.startTime ?? undefined}
                progress={item.status === "completed" ? 100 : 0}
                complete={item.status === "completed"}
                accentFill={level.accentFill}
              />
            ))
          : nodes.map((node) => (
              <ObjectiveRow
                key={node.id}
                title={node.title}
                meta={node.description}
                progress={node.progress}
                complete={node.status === "completed" || node.progress >= 100}
                accentFill={level.accentFill}
                onClick={() => onSelectNode(node)}
              />
            ))}

        {total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Target aria-hidden className={"h-5 w-5 opacity-40 " + level.accentText} />
            <p className="atlas-muted text-xs">{isDay ? "No quests this day" : "No objectives yet"}</p>
            {addBlockedReason ? (
              <p className="atlas-muted max-w-[200px] text-[0.66rem] leading-relaxed">{addBlockedReason}</p>
            ) : (
              <button type="button" onClick={onAdd} className={"text-xs font-semibold transition hover:text-white " + level.accentText}>
                + Add
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
