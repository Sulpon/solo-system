"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, CircleDot, Timer } from "lucide-react";
import Card from "../Card";
import CalendarTimeGrid from "../calendar/CalendarTimeGrid";
import InboxComposer from "../notes/InboxComposer";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useNotes } from "../../_lib/hooks/useNotes";
import { useFocus } from "../../_lib/focus-store";
import { applyQuestSchedule, buildCalendarDay } from "../../_lib/engines/quest-calendar-engine";
import type { QuestSchedulePatch } from "../../_lib/engines/quest-calendar-engine";
import { formatMinutes, getBlockMinutes, getUpcomingDeadlines, summariseDay } from "../../_lib/engines/daily-plan-engine";
import { getElapsedMs } from "../../_lib/focus-stats";
import { getLocalDayKey } from "../../_lib/local-day";

type DailyStudioViewProps = Readonly<{
  onOpenQuest: (questId: string) => void;
  onAddQuest: (dayKey: string, startTime?: string, endTime?: string) => void;
}>;

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// The operational day: what is scheduled, what is left, what is running.
//
// Every block, task and figure below comes from the same Quests and
// QuestCompletions the Calendar and the Goal Tree read. The timeline is
// the Calendar's own CalendarTimeGrid, so creating, moving and resizing a
// block here writes through exactly the same schedule patch - there is no
// second day model and nothing can drift between the two views.
export default function DailyStudioView({ onOpenQuest, onAddQuest }: DailyStudioViewProps) {
  const { isReady, questDefinitions, questCompletions, setQuestDefinitions, setQuestCompletionForToday } = useProgression();
  const { goalTree } = useGoalTree();
  const { addNote } = useNotes();
  const { activeSession } = useFocus();

  const [cursor, setCursor] = useState(() => new Date());

  const todayKey = useMemo(() => getLocalDayKey(), []);
  const dayKey = getLocalDayKey(cursor);
  const isToday = dayKey === todayKey;

  const cell = useMemo(() => buildCalendarDay(questDefinitions, questCompletions, cursor), [questDefinitions, questCompletions, cursor]);
  const summary = useMemo(() => summariseDay(cell.items), [cell]);
  const deadlines = useMemo(() => getUpcomingDeadlines(goalTree, cursor, 14).slice(0, 6), [goalTree, cursor]);

  const focusQuest = activeSession?.linkedQuestId ? questDefinitions.find((quest) => quest.id === activeSession.linkedQuestId) : undefined;

  if (!isReady) {
    return (
      <Card className="p-5">
        <p className="atlas-muted text-sm">Loading your day...</p>
      </Card>
    );
  }

  function reschedule(questId: string, patch: QuestSchedulePatch) {
    setQuestDefinitions(questDefinitions.map((quest) => (quest.id === questId ? applyQuestSchedule(quest, patch) : quest)));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(20rem,0.85fr)]">
      {/* min-w-0 on both columns, or the grid refuses to shrink them below
          their content: a long quest title in the timeline pushed the whole
          card past the right edge of a phone, taking its border and the
          Today button off-screen with it. */}
      <div className="min-w-0 space-y-4">
        <Card className="p-4" testId="daily-timeline">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="atlas-accent text-[0.62rem] font-semibold uppercase tracking-[0.28em]">{isToday ? "Today" : "Planned day"}</p>
              <h2 className="atlas-display text-lg font-bold text-white">
                {cursor.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
              </h2>
            </div>

            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setCursor((current) => addDays(current, -1))} aria-label="Previous day" className="atlas-muted rounded-lg border border-white/10 p-1.5 transition hover:text-white">
                <ChevronLeft aria-hidden className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setCursor(new Date())} disabled={isToday} className="atlas-muted rounded-lg border border-white/10 px-3 py-1.5 text-xs transition hover:text-white disabled:opacity-30">
                Today
              </button>
              <button type="button" onClick={() => setCursor((current) => addDays(current, 1))} aria-label="Next day" className="atlas-muted rounded-lg border border-white/10 p-1.5 transition hover:text-white">
                <ChevronRight aria-hidden className="h-4 w-4" />
              </button>
            </div>
          </div>

          <CalendarTimeGrid
            days={[cell]}
            todayKey={todayKey}
            onOpenQuest={onOpenQuest}
            onCreateRange={(createdDayKey, startTime, endTime) => onAddQuest(createdDayKey, startTime, endTime)}
            onReschedule={reschedule}
          />
        </Card>
      </div>

      <div className="min-w-0 space-y-4">
        {/* Only when a session is genuinely running - there is no placeholder
            timer for an idle day. */}
        {activeSession ? (
          <Card className="p-4" testId="daily-focus-session">
            <p className="atlas-accent flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.28em]">
              <Timer aria-hidden className="h-3.5 w-3.5" />
              Focus running
            </p>
            {/* A session need not be tied to a Quest; when it is not, the
                mode is the only honest thing to call it. */}
            <p className="mt-1 truncate text-sm font-semibold text-white">{focusQuest?.title ?? activeSession.mode.replace(/-/g, " ")}</p>
            <p className="atlas-muted mt-0.5 text-xs">{formatMinutes(Math.floor(getElapsedMs(activeSession) / 60000))} elapsed</p>
          </Card>
        ) : null}

        <Card className="p-4" testId="daily-progress">
          <p className="atlas-accent text-[0.62rem] font-semibold uppercase tracking-[0.28em]">Progress</p>

          {summary.total === 0 ? (
            <p className="atlas-muted mt-2 text-xs">Nothing scheduled for this day yet. Drag on the timeline to block out time.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-white">
                <span className="text-lg font-bold">{summary.completed}</span>
                <span className="atlas-muted"> / {summary.total} done</span>
              </p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-[rgb(var(--atlas-accent,168_85_247))]" style={{ width: `${Math.round((summary.completed / summary.total) * 100)}%` }} />
              </div>
              <p className="atlas-muted mt-2 text-[0.7rem]">
                {formatMinutes(summary.completedMinutes)} of {formatMinutes(summary.plannedMinutes)} scheduled time done
                {/* Said plainly, because Atlas stores no effort estimate:
                    the figure above covers only blocks with a start and an
                    end, never the whole day. */}
                {summary.untimedCount > 0 ? <span className="opacity-60"> · {summary.untimedCount} item{summary.untimedCount === 1 ? "" : "s"} with no set time</span> : null}
              </p>
            </>
          )}
        </Card>

        <Card className="p-4" testId="daily-tasks">
          <div className="flex items-center justify-between gap-2">
            <p className="atlas-accent text-[0.62rem] font-semibold uppercase tracking-[0.28em]">Tasks</p>
            <button type="button" onClick={() => onAddQuest(dayKey)} className="atlas-muted text-xs transition hover:text-white">
              + Add
            </button>
          </div>

          {cell.items.length === 0 ? (
            <p className="atlas-muted mt-2 text-xs">No quests on this day.</p>
          ) : (
            <ul className="mt-2 space-y-1">
              {cell.items.map((entry) => {
                const minutes = getBlockMinutes(entry);
                const done = entry.status === "completed";

                return (
                  <li key={entry.quest.id} className="flex items-start gap-2 rounded-lg px-1.5 py-1.5 transition hover:bg-white/[0.04]">
                    {/* Completion only exists for today - a past or future
                        day has no "today" completion to write. */}
                    <input
                      type="checkbox"
                      checked={done}
                      disabled={!isToday}
                      onChange={(event) => setQuestCompletionForToday(entry.quest.id, event.target.checked)}
                      aria-label={`Complete ${entry.quest.title}`}
                      title={isToday ? undefined : "Quests are completed on the day they happen"}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[rgb(var(--atlas-accent,168_85_247))] disabled:opacity-30"
                    />

                    <button type="button" onClick={() => onOpenQuest(entry.quest.id)} className="min-w-0 flex-1 text-left">
                      <span className={"block truncate text-sm " + (done ? "text-white/45 line-through" : "text-white/90")}>{entry.quest.title}</span>
                      <span className="atlas-muted block text-[0.68rem]">
                        {entry.startTime ? entry.startTime : "No set time"}
                        {minutes !== null ? ` · ${formatMinutes(minutes)}` : ""}
                        {entry.isRecurring ? " · repeats" : ""}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4" testId="daily-deadlines">
          <p className="atlas-accent text-[0.62rem] font-semibold uppercase tracking-[0.28em]">Deadlines</p>

          {deadlines.length === 0 ? (
            <p className="atlas-muted mt-2 text-xs">Nothing due in the next two weeks.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {deadlines.map((entry) => (
                <li key={entry.node.id} className="flex items-start gap-2 text-xs">
                  <CircleDot aria-hidden className={"mt-0.5 h-3 w-3 shrink-0 " + (entry.isOverdue ? "text-amber-300/80" : "atlas-muted")} />
                  <Link href="/goals" className="min-w-0 flex-1 truncate text-white/80 transition hover:text-white">
                    {entry.node.title}
                  </Link>
                  <span className={"shrink-0 " + (entry.isOverdue ? "text-amber-200/90" : "atlas-muted")}>
                    {entry.isOverdue ? `${Math.abs(entry.daysLeft)}d over` : entry.daysLeft === 0 ? "today" : `${entry.daysLeft}d`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <Link href="/calendar" className="atlas-muted mt-3 flex items-center gap-1.5 text-xs transition hover:text-white">
            <CalendarDays aria-hidden className="h-3.5 w-3.5" />
            Open the full calendar
          </Link>
        </Card>

        {/* The same capture box the Notes inbox uses, writing to the same
            notes - not a second quick-capture with its own store. */}
        <div data-testid="daily-quick-capture">
          <InboxComposer onCapture={(draft) => addNote(draft)} />
        </div>
      </div>
    </div>
  );
}
