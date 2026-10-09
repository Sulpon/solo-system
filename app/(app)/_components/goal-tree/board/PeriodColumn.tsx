"use client";

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
  // show instead of a dead add row.
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
      <div className="flex items-start gap-2.5">
        <span className={"mt-0.5 h-4 w-4 shrink-0 rounded-[0.25rem] border " + (complete ? accentFill + " border-transparent" : "border-white/25")} aria-hidden />
        <span className={"min-w-0 flex-1 text-sm leading-snug " + (complete ? "text-white/45 line-through" : "text-white/90")}>{title}</span>
        {/* A percentage is only worth the space once there is progress to
            report; an untouched objective reads as a plain line. */}
        {clamped > 0 ? <span className="atlas-muted shrink-0 text-[0.68rem]">{clamped}%</span> : null}
      </div>
      {meta ? <p className="atlas-muted mt-1 pl-[1.625rem] text-[0.7rem] leading-snug">{meta}</p> : null}
      {clamped > 0 ? (
        <div className="ml-[1.625rem] mt-2 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
          <div className={"h-full rounded-full " + accentFill} style={{ width: `${clamped}%` }} />
        </div>
      ) : null}
    </>
  );

  if (!onClick) {
    return <div className="rounded-lg px-2 py-1.5">{body}</div>;
  }

  return (
    <button type="button" onClick={onClick} className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-white/[0.05]">
      {body}
    </button>
  );
}

// One period of the board, as a pane rather than a card: columns are
// divided by a hairline and run the full height of the page, so the board
// reads as one surface split by time instead of a row of boxes.
//
// Shows only what Atlas actually stores: how many objectives sit in this
// period and how far they have come. Deliberately no planned/spent hours -
// Atlas records no time estimate per goal, so those figures would be
// invented.
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
        // grow + a basis equal to the minimum means a handful of columns
        // spread across the whole window, while a year of weeks keeps a
        // readable width and scrolls sideways instead of being crushed.
        "flex min-w-[15.5rem] grow basis-[15.5rem] flex-col border-l border-white/[0.06] px-3 py-3 first:border-l-0 " +
        (column.isCurrent ? level.accentWash : "")
      }
    >
      <header className="px-2">
        <div className="flex items-baseline gap-2">
          <h3 className={"atlas-display truncate text-xl font-bold tracking-tight " + (column.isCurrent ? "text-white" : "text-white/70")}>
            {column.title}
          </h3>
          <span className={"truncate text-[0.7rem] font-medium " + level.accentText}>{column.subtitle}</span>
        </div>

        <p className="atlas-muted mt-1 text-[0.68rem]">
          {completed}/{total} done
          {total > 0 ? <span className="opacity-60"> · {isDay ? `${quests.length} quest${quests.length === 1 ? "" : "s"}` : `${stats.progress}%`}</span> : null}
        </p>
      </header>

      <div className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
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

        {/* The add affordance lives at the end of the list, where the next
            objective would go, rather than as a separate button in the
            header. When the level cannot accept one yet, the reason takes
            its place instead of a dead control. */}
        {addBlockedReason ? (
          <p className="atlas-muted px-2 py-1.5 text-[0.68rem] leading-relaxed">{addBlockedReason}</p>
        ) : (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add to ${column.title}`}
            className="atlas-muted flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition hover:bg-white/[0.04] hover:text-white"
          >
            <span className="h-4 w-4 shrink-0 rounded-[0.25rem] border border-dashed border-white/20" aria-hidden />
            Add...
          </button>
        )}
      </div>
    </section>
  );
}
