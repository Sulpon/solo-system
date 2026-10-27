"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { getCardsForDay, getUnscheduledActiveCards } from "../../_lib/engines/card-engine";
import { startOfWeekMonday } from "../../_lib/engines/period-board";
import { getLocalDayKey } from "../../_lib/local-day";
import type { CardDeck, IndexCard } from "../../_lib/types/card";

// The weekly lay-out: take the hand, drop each card on the day you intend
// to do it, exactly like laying sticky notes across a desk.
//
// Dropping is the ONLY way a card gets a day here. There is no date field
// to type into, because the whole point of the physical method is that
// planning is a movement, not a form.
//
// A card dropped back onto the hand loses its day rather than being
// deleted - changing your mind about when is not changing your mind about
// whether.

const HAND_ID = "card-hand";

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type CardWeekBoardProps = Readonly<{
  cards: ReadonlyArray<IndexCard>;
  decks: ReadonlyArray<CardDeck>;
  onPlace: (cardId: string, dayKey: string | null) => void;
  onFinish: (cardId: string) => void;
}>;

export default function CardWeekBoard({ cards, decks, onPlace, onFinish }: CardWeekBoardProps) {
  const [weekOffset, setWeekOffset] = useState(0);

  // A small activation distance so a tap to finish a card is not swallowed
  // as the start of a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const weekStart = useMemo(() => addDays(startOfWeekMonday(new Date()), weekOffset * 7), [weekOffset]);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = addDays(weekStart, index);
        return { date, dayKey: getLocalDayKey(date) };
      }),
    [weekStart],
  );

  const hand = useMemo(() => getUnscheduledActiveCards(cards), [cards]);
  const todayKey = getLocalDayKey(new Date());

  function handleDragEnd(event: DragEndEvent) {
    const cardId = String(event.active.id);
    const over = event.over?.id;

    if (!over) {
      return;
    }

    onPlace(cardId, over === HAND_ID ? null : String(over));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="atlas-display text-xl font-black text-white">
            Week of {weekStart.toLocaleDateString(undefined, { day: "numeric", month: "long" })}
          </h2>
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setWeekOffset((current) => current - 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:text-white">
              ‹
            </button>
            <button type="button" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white disabled:opacity-40">
              This week
            </button>
            <button type="button" onClick={() => setWeekOffset((current) => current + 1)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 transition hover:text-white">
              ›
            </button>
          </div>
        </div>

        <Hand cards={hand} decks={decks} />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
          {days.map(({ date, dayKey }) => (
            <DayColumn
              key={dayKey}
              dayKey={dayKey}
              date={date}
              isToday={dayKey === todayKey}
              cards={getCardsForDay(cards, dayKey)}
              decks={decks}
              onFinish={onFinish}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}

function Hand({ cards, decks }: Readonly<{ cards: ReadonlyArray<IndexCard>; decks: ReadonlyArray<CardDeck> }>) {
  const { setNodeRef, isOver } = useDroppable({ id: HAND_ID });

  return (
    <div
      ref={setNodeRef}
      data-testid="card-hand"
      className={
        "rounded-2xl border p-4 transition " +
        (isOver ? "border-[rgb(var(--atlas-accent,168_85_247)/0.6)] bg-[rgb(var(--atlas-accent,168_85_247)/0.08)]" : "border-slate-800 bg-slate-950/40")
      }
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">In hand · {cards.length}</p>

      {cards.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">Every filed card has a day. Drag one back here to unschedule it.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {cards.map((card) => (
            <DraggableCard key={card.id} card={card} decks={decks} />
          ))}
        </div>
      )}
    </div>
  );
}

function DayColumn({
  dayKey,
  date,
  isToday,
  cards,
  decks,
  onFinish,
}: Readonly<{ dayKey: string; date: Date; isToday: boolean; cards: ReadonlyArray<IndexCard>; decks: ReadonlyArray<CardDeck>; onFinish: (cardId: string) => void }>) {
  const { setNodeRef, isOver } = useDroppable({ id: dayKey });

  return (
    <div
      ref={setNodeRef}
      data-testid={"day-" + dayKey}
      className={
        "min-h-[9rem] rounded-xl border p-3 transition " +
        (isOver
          ? "border-[rgb(var(--atlas-accent,168_85_247)/0.6)] bg-[rgb(var(--atlas-accent,168_85_247)/0.1)]"
          : isToday
            ? "border-cyan-400/40 bg-slate-950/50"
            : "border-slate-800 bg-slate-950/40")
      }
    >
      <p className={"text-xs font-semibold uppercase tracking-[0.14em] " + (isToday ? "text-cyan-300" : "text-slate-500")}>
        {date.toLocaleDateString(undefined, { weekday: "short" })} {date.getDate()}
      </p>

      <div className="mt-2 space-y-2">
        {cards.map((card) => (
          <DraggableCard key={card.id} card={card} decks={decks} onFinish={onFinish} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ card, decks, onFinish }: Readonly<{ card: IndexCard; decks: ReadonlyArray<CardDeck>; onFinish?: (cardId: string) => void }>) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const deck = decks.find((entry) => entry.id === card.deckId);

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={
        "group rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-left shadow-[0_2px_8px_rgba(0,0,0,0.4)] " +
        (isDragging ? "z-50 opacity-90 shadow-[0_16px_32px_rgba(0,0,0,0.6)]" : "")
      }
    >
      <div className="flex items-start gap-2">
        {/* The whole card is the drag handle except the Done button -
            picking a card up should not require aiming at a grip. */}
        <button
          type="button"
          ref={undefined}
          {...listeners}
          {...attributes}
          aria-label={"Move " + card.title}
          className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
        >
          <span className="flex items-center gap-1.5">
            <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + (deck?.accent ?? "bg-slate-600")} aria-hidden />
            <span className="truncate text-xs font-semibold text-white">{card.title}</span>
          </span>
        </button>

        {onFinish ? (
          <button
            type="button"
            onClick={() => onFinish(card.id)}
            aria-label={"Finish " + card.title}
            className="shrink-0 rounded border border-emerald-500/40 px-1.5 text-[10px] font-semibold text-emerald-200 opacity-0 transition hover:bg-emerald-500/20 group-hover:opacity-100"
          >
            ✓
          </button>
        ) : null}
      </div>
    </div>
  );
}
