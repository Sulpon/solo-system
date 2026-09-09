"use client";

import { useEffect, useRef, useState } from "react";
import type { CalendarDayCell, QuestSchedulePatch } from "../../_lib/engines/quest-calendar-engine";
import type { Quest } from "../../_lib/types/quest";
import { DEFAULT_DURATION_MINUTES, MINUTES_PER_DAY, SNAP_MINUTES, WORK_HOURS_START, minutesToTime, snapMinutes, timeToMinutes } from "../../_lib/calendar-time";
import QuestChip from "./QuestChip";
import CalendarTimeAxis from "./CalendarTimeAxis";
import CalendarEventBlock from "./CalendarEventBlock";

const HOUR_PX = 56;
const PX_PER_MINUTE = HOUR_PX / 60;
// A pointer down/up with less movement than this counts as a plain click
// (open the Quest Detail Panel) rather than a drag (commit a move).
const CLICK_THRESHOLD_PX = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type DragState =
  | Readonly<{ kind: "create"; dayKey: string; anchorMinutes: number; currentMinutes: number }>
  | Readonly<{
      kind: "move";
      quest: Quest;
      allowDayChange: boolean;
      originDayKey: string;
      durationMinutes: number;
      pointerStartX: number;
      pointerStartY: number;
      currentDayKey: string;
      currentStartMinutes: number;
      moved: boolean;
    }>
  | Readonly<{ kind: "resize"; quest: Quest; startMinutes: number; pointerStartY: number; initialEndMinutes: number; currentEndMinutes: number }>;

type CalendarTimeGridProps = Readonly<{
  days: ReadonlyArray<CalendarDayCell>;
  dayLabels?: ReadonlyArray<string>;
  todayKey: string;
  selectedDayKey?: string;
  onSelectDate?: (dayKey: string) => void;
  onOpenQuest: (questId: string) => void;
  onCreateRange: (dayKey: string, startTime: string, endTime: string) => void;
  onReschedule: (questId: string, patch: QuestSchedulePatch) => void;
}>;

// The shared Google-Calendar-style scheduler grid behind both WeekView (7
// columns) and DayView (1 column) - built once here rather than duplicated,
// since the interaction logic (drag-to-create, drag-to-move, resize, snap,
// current-time line) is identical between them, only the day count differs.
export default function CalendarTimeGrid({ days, dayLabels, todayKey, selectedDayKey, onSelectDate, onOpenQuest, onCreateRange, onReschedule }: CalendarTimeGridProps) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [now, setNow] = useState(() => new Date());
  const columnRefs = useRef<Array<HTMLDivElement | null>>([]);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  // Pointer handlers below read/write this ref rather than calling
  // setDragState's functional-updater form, because handleUp needs to call
  // onCreateRange/onReschedule/onOpenQuest (parent setState) as a plain side
  // effect of the native pointerup listener - doing that from inside a
  // setState updater trips React's "cannot update a component while
  // rendering a different component" warning (updaters must be pure and can
  // run during render). The ref is always current, even across a fast burst
  // of pointermove events between renders, so this loses nothing over the
  // functional-updater form.
  const dragStateRef = useRef<DragState | null>(null);

  function updateDrag(next: DragState | null) {
    dragStateRef.current = next;
    setDragState(next);
  }

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  // "When opening Week or Day view, automatically scroll to a sensible
  // working-hour range" - fires once when this grid mounts (i.e. exactly
  // when the user switches into Week/Day), not on every Previous/Next.
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = WORK_HOURS_START * HOUR_PX - 24;
    }
  }, []);

  useEffect(() => {
    if (!dragState) return;

    function minutesFromClientY(dayKey: string, clientY: number) {
      const index = days.findIndex((day) => day.dayKey === dayKey);
      const column = index >= 0 ? columnRefs.current[index] : null;
      if (!column) return null;
      const rect = column.getBoundingClientRect();
      return clamp((clientY - rect.top) / PX_PER_MINUTE, 0, MINUTES_PER_DAY);
    }

    function columnAtClientX(clientX: number): string | null {
      for (let index = 0; index < days.length; index += 1) {
        const column = columnRefs.current[index];
        if (!column) continue;
        const rect = column.getBoundingClientRect();
        if (clientX >= rect.left && clientX < rect.right) return days[index].dayKey;
      }
      return null;
    }

    function handleMove(event: PointerEvent) {
      const state = dragStateRef.current;
      if (!state) return;

      if (state.kind === "create") {
        const raw = minutesFromClientY(state.dayKey, event.clientY);
        if (raw === null) return;
        updateDrag({ ...state, currentMinutes: snapMinutes(raw) });
        return;
      }

      if (state.kind === "move") {
        const deltaMinutes = snapMinutes((event.clientY - state.pointerStartY) / PX_PER_MINUTE);
        // Measured from the quest's original start (captured once at
        // pointer-down) every time, not the previous frame's value - so
        // snap rounding never compounds across pointermove events.
        const baseStartMinutes = state.quest.scheduledStartTime ? timeToMinutes(state.quest.scheduledStartTime) : WORK_HOURS_START * 60;
        const nextStart = clamp(baseStartMinutes + deltaMinutes, 0, MINUTES_PER_DAY - state.durationMinutes);

        let nextDayKey = state.originDayKey;
        if (state.allowDayChange) {
          const columnDayKey = columnAtClientX(event.clientX);
          if (columnDayKey) nextDayKey = columnDayKey;
        }

        const distance = Math.hypot(event.clientX - state.pointerStartX, event.clientY - state.pointerStartY);
        updateDrag({ ...state, currentDayKey: nextDayKey, currentStartMinutes: nextStart, moved: distance > CLICK_THRESHOLD_PX });
        return;
      }

      if (state.kind === "resize") {
        const deltaMinutes = snapMinutes((event.clientY - state.pointerStartY) / PX_PER_MINUTE);
        const nextEnd = clamp(state.initialEndMinutes + deltaMinutes, state.startMinutes + SNAP_MINUTES, MINUTES_PER_DAY);
        updateDrag({ ...state, currentEndMinutes: nextEnd });
      }
    }

    function handleUp() {
      const state = dragStateRef.current;
      if (!state) return;

      if (state.kind === "create") {
        const start = Math.min(state.anchorMinutes, state.currentMinutes);
        const rawEnd = Math.max(state.anchorMinutes, state.currentMinutes);
        const end = rawEnd - start >= SNAP_MINUTES ? rawEnd : Math.min(MINUTES_PER_DAY, start + DEFAULT_DURATION_MINUTES);
        updateDrag(null);
        onCreateRange(state.dayKey, minutesToTime(start), minutesToTime(end));
        return;
      }

      if (state.kind === "move") {
        updateDrag(null);
        if (state.moved) {
          const patch: QuestSchedulePatch = {
            scheduledStartTime: minutesToTime(state.currentStartMinutes),
            scheduledEndTime: minutesToTime(clamp(state.currentStartMinutes + state.durationMinutes, 0, MINUTES_PER_DAY)),
            ...(state.allowDayChange ? { scheduledDate: state.currentDayKey } : {}),
          };
          onReschedule(state.quest.id, patch);
        } else {
          onOpenQuest(state.quest.id);
        }
        return;
      }

      if (state.kind === "resize") {
        updateDrag(null);
        onReschedule(state.quest.id, { scheduledEndTime: minutesToTime(state.currentEndMinutes) });
      }
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragState, days, onCreateRange, onOpenQuest, onReschedule]);

  function beginCreate(dayKey: string, event: React.PointerEvent) {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    const index = days.findIndex((day) => day.dayKey === dayKey);
    const column = index >= 0 ? columnRefs.current[index] : null;
    if (!column) return;
    const rect = column.getBoundingClientRect();
    const minutes = snapMinutes(clamp((event.clientY - rect.top) / PX_PER_MINUTE, 0, MINUTES_PER_DAY));
    updateDrag({ kind: "create", dayKey, anchorMinutes: minutes, currentMinutes: minutes });
  }

  function beginMove(quest: Quest, dayKey: string, isRecurring: boolean, event: React.PointerEvent) {
    const startMinutes = quest.scheduledStartTime ? timeToMinutes(quest.scheduledStartTime) : WORK_HOURS_START * 60;
    const endMinutes = quest.scheduledEndTime ? timeToMinutes(quest.scheduledEndTime) : startMinutes + DEFAULT_DURATION_MINUTES;
    updateDrag({
      kind: "move",
      quest,
      allowDayChange: !isRecurring,
      originDayKey: dayKey,
      durationMinutes: Math.max(SNAP_MINUTES, endMinutes - startMinutes),
      pointerStartX: event.clientX,
      pointerStartY: event.clientY,
      currentDayKey: dayKey,
      currentStartMinutes: startMinutes,
      moved: false,
    });
  }

  function beginResize(quest: Quest, event: React.PointerEvent) {
    const startMinutes = quest.scheduledStartTime ? timeToMinutes(quest.scheduledStartTime) : WORK_HOURS_START * 60;
    const endMinutes = quest.scheduledEndTime ? timeToMinutes(quest.scheduledEndTime) : startMinutes + DEFAULT_DURATION_MINUTES;
    updateDrag({ kind: "resize", quest, startMinutes, pointerStartY: event.clientY, initialEndMinutes: endMinutes, currentEndMinutes: endMinutes });
  }

  const gridBackground = {
    backgroundImage:
      `repeating-linear-gradient(to bottom, rgba(51,65,85,0.55) 0, rgba(51,65,85,0.55) 1px, transparent 1px, transparent ${HOUR_PX}px), ` +
      `repeating-linear-gradient(to bottom, rgba(51,65,85,0.28) 0, rgba(51,65,85,0.28) 1px, transparent 1px, transparent ${HOUR_PX / 2}px)`,
  } as const;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const bodyHeight = MINUTES_PER_DAY * PX_PER_MINUTE;
  const columnMinWidth = days.length > 1 ? 120 : 0;

  return (
    <div className="overflow-x-auto">
      <div style={days.length > 1 ? { minWidth: days.length * columnMinWidth + 56 } : undefined}>
        {dayLabels ? (
          <div className="flex">
            <div className="w-12 shrink-0 sm:w-14" />
            {days.map((cell, index) => {
              const isToday = cell.dayKey === todayKey;
              const isSelected = selectedDayKey === cell.dayKey;
              return (
                <div
                  key={cell.dayKey}
                  role={onSelectDate ? "button" : undefined}
                  tabIndex={onSelectDate ? 0 : undefined}
                  onClick={() => onSelectDate?.(cell.dayKey)}
                  onKeyDown={(event) => {
                    if (onSelectDate && (event.key === "Enter" || event.key === " ")) onSelectDate(cell.dayKey);
                  }}
                  className={"flex-1 border-l border-slate-800 py-1 text-center " + (onSelectDate ? "cursor-pointer " : "") + (isSelected ? "bg-purple-500/10" : "")}
                  style={{ minWidth: columnMinWidth || undefined }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{dayLabels[index]}</p>
                  <p className={"text-sm font-bold " + (isToday ? "text-cyan-300" : "text-white")}>{cell.date.getDate()}</p>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="flex border-y border-slate-800">
          <div className="flex w-12 shrink-0 items-center justify-end pr-1 sm:w-14">
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-600">All-day</span>
          </div>
          {days.map((cell) => {
            const allDayItems = cell.items.filter((item) => !item.startTime);
            return (
              <div key={cell.dayKey} className="max-h-16 flex-1 space-y-1 overflow-y-auto border-l border-slate-800 p-1" style={{ minWidth: columnMinWidth || undefined }}>
                {allDayItems.map((item) => (
                  <QuestChip key={item.quest.id} item={item} onClick={() => onOpenQuest(item.quest.id)} compact />
                ))}
              </div>
            );
          })}
        </div>

        <div ref={bodyRef} className="flex overflow-y-auto" style={{ maxHeight: 560 }}>
          <CalendarTimeAxis hourHeightPx={HOUR_PX} />
          {days.map((cell, index) => {
            const timedItems = cell.items.filter((item) => item.startTime);
            const isToday = cell.dayKey === todayKey;
            const ghost = dragState?.kind === "create" && dragState.dayKey === cell.dayKey ? dragState : null;
            const movingHere = dragState?.kind === "move" && dragState.currentDayKey === cell.dayKey ? dragState : null;
            const resizing = dragState?.kind === "resize" ? dragState : null;

            return (
              <div
                key={cell.dayKey}
                data-day-key={cell.dayKey}
                ref={(element) => {
                  columnRefs.current[index] = element;
                }}
                onPointerDown={(event) => {
                  if ((event.target as HTMLElement).closest("[data-calendar-block]")) return;
                  beginCreate(cell.dayKey, event);
                }}
                style={{ height: bodyHeight, minWidth: columnMinWidth || undefined, touchAction: "none", ...gridBackground }}
                className="relative flex-1 border-l border-slate-800"
              >
                {timedItems.map((item) => {
                  const isBeingMoved = dragState?.kind === "move" && dragState.quest.id === item.quest.id;
                  if (isBeingMoved) return null;
                  const isBeingResized = resizing?.quest.id === item.quest.id;
                  const startMinutes = item.startTime ? timeToMinutes(item.startTime) : WORK_HOURS_START * 60;
                  const endMinutes = isBeingResized && resizing ? resizing.currentEndMinutes : item.endTime ? timeToMinutes(item.endTime) : startMinutes + DEFAULT_DURATION_MINUTES;
                  return (
                    <CalendarEventBlock
                      key={item.quest.id}
                      item={item}
                      top={startMinutes * PX_PER_MINUTE}
                      height={Math.max(SNAP_MINUTES, endMinutes - startMinutes) * PX_PER_MINUTE}
                      onPointerDownMove={(event) => beginMove(item.quest, cell.dayKey, item.isRecurring, event)}
                      onPointerDownResize={(event) => beginResize(item.quest, event)}
                    />
                  );
                })}

                {movingHere ? (
                  <div
                    className="absolute inset-x-0.5 rounded-lg border-2 border-dashed border-purple-300/70 bg-purple-500/10"
                    style={{ top: movingHere.currentStartMinutes * PX_PER_MINUTE, height: movingHere.durationMinutes * PX_PER_MINUTE }}
                  />
                ) : null}

                {ghost ? (
                  <div
                    className="absolute inset-x-0.5 flex flex-col items-start justify-start rounded-lg border-2 border-dashed border-cyan-300/70 bg-cyan-400/10 px-1.5 py-1 text-[10px] font-semibold text-cyan-100"
                    style={{
                      top: Math.min(ghost.anchorMinutes, ghost.currentMinutes) * PX_PER_MINUTE,
                      height: Math.max(SNAP_MINUTES, Math.abs(ghost.currentMinutes - ghost.anchorMinutes)) * PX_PER_MINUTE,
                    }}
                  >
                    New Quest
                    <span className="font-normal opacity-80">
                      {minutesToTime(Math.min(ghost.anchorMinutes, ghost.currentMinutes))} – {minutesToTime(Math.max(ghost.anchorMinutes, ghost.currentMinutes))}
                    </span>
                  </div>
                ) : null}

                {isToday ? (
                  <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center gap-1" style={{ top: nowMinutes * PX_PER_MINUTE }}>
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                    <span className="h-px flex-1 bg-rose-400/70" />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
