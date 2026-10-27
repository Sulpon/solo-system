"use client";

import { useState } from "react";
import type { CardDeck, IndexCard } from "../../_lib/types/card";

// A deck of index cards as you would hold it: overlapped, every card's top
// strip showing, the whole hand readable without clicking anything.
//
// WHY OVERLAP RATHER THAN A LIST
//
// A list of equal rows is a list; it does not read as a deck and it wastes
// the one advantage paper has - you can see twenty cards at once because
// only the top of each is needed to know what it is. Each card here is
// offset by COLLAPSED_PEEK, so the visible strip is exactly the title. The
// card under the pointer lifts to full height in place, the way a thumb
// riffles one card forward without removing it from the hand.
//
// There is deliberately no next/previous control. Going through the deck
// is scrolling, which is continuous and as fast as the user wants, rather
// than one click per card.

// A card is always its full height. It is the OVERLAP that hides most of
// it, exactly as in a real hand - cards sized to their peek would be a
// list of thin rows, which is what this looked like before and why it did
// not read as a deck.
const CARD_HEIGHT = 128;

// How much of each card shows above the one in front: the title AND the
// deck label beneath it, both fully clear of the next card's edge. Sized
// to the content rather than guessed - at 46px the label was sliced in
// half, which looked like a rendering fault rather than a deck.
const COLLAPSED_PEEK = 56;

// How far a lifted card has to push its neighbours down to be fully clear.
const LIFT_GAP = CARD_HEIGHT - COLLAPSED_PEEK + 12;

type CardStackProps = Readonly<{
  cards: ReadonlyArray<IndexCard>;
  decks: ReadonlyArray<CardDeck>;
  onFinish?: (cardId: string) => void;
  onReopen?: (cardId: string) => void;
  onFile?: (cardId: string, deckId: string | null) => void;
  onRemove?: (cardId: string) => void;
  onOpen?: (cardId: string) => void;
  emptyMessage: string;
  testId?: string;
}>;

export default function CardStack({ cards, decks, onFinish, onReopen, onFile, onRemove, onOpen, emptyMessage, testId }: CardStackProps) {
  const [liftedId, setLiftedId] = useState<string | null>(null);

  if (cards.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-400">{emptyMessage}</div>
    );
  }

  // The stack reserves its full height up front, including room for one
  // lift, so riffling never shoves the rest of the page around - the hand
  // stays still while a card comes forward.
  const liftedIndex = cards.findIndex((card) => card.id === liftedId);
  const stackHeight = (cards.length - 1) * COLLAPSED_PEEK + CARD_HEIGHT + (liftedIndex >= 0 ? LIFT_GAP : 0);

  return (
    <div data-testid={testId} className="relative" style={{ height: stackHeight }} onMouseLeave={() => setLiftedId(null)}>
      {cards.map((card, index) => {
        const isLifted = card.id === liftedId;
        // Cards behind the lifted one slide down so it is fully readable
        // without covering the next card's title.
        const pushDown = liftedIndex >= 0 && index > liftedIndex ? LIFT_GAP : 0;
        const deck = decks.find((entry) => entry.id === card.deckId);
        const isDone = card.status === "done";

        return (
          <article
            key={card.id}
            data-testid="index-card"
            data-card-id={card.id}
            onMouseEnter={() => setLiftedId(card.id)}
            onFocus={() => setLiftedId(card.id)}
            style={{
              top: index * COLLAPSED_PEEK + pushDown,
              // Later cards sit on top, the way a stack is built up.
              zIndex: isLifted ? cards.length + 1 : index,
              height: CARD_HEIGHT,
            }}
            className={
              "absolute inset-x-0 overflow-hidden rounded-xl border px-4 py-3 transition-all duration-200 " +
              // A real stack casts a shadow onto the card behind it, and
              // each card's top edge catches light. Both cues are what
              // make this read as a deck rather than a list of rows.
              "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/10 " +
              (isLifted
                ? "border-[rgb(var(--atlas-accent,168_85_247)/0.55)] bg-slate-900 shadow-[0_22px_45px_rgba(0,0,0,0.6)]"
                : "border-slate-800 bg-slate-900 shadow-[0_-2px_10px_rgba(0,0,0,0.5)]")
            }
          >
            <div className="flex items-start gap-2">
              <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + (deck?.accent ?? "bg-slate-600")} aria-hidden />

              <button
                type="button"
                onClick={() => (onOpen ? onOpen(card.id) : setLiftedId(isLifted ? null : card.id))}
                className="min-w-0 flex-1 text-left"
              >
                <h3 className={"truncate text-sm font-bold " + (isDone ? "text-slate-500 line-through" : "text-white")}>{card.title}</h3>
                <p className="mt-0.5 truncate text-[11px] text-slate-500">
                  {deck ? deck.name : "Unsorted"}
                  {card.scheduledDate ? ` · ${card.scheduledDate}` : ""}
                </p>
              </button>
            </div>

            {/* Only drawn for the lifted card: the detail and the actions
                are what the lift is for, and rendering them underneath
                would show through the next card's top strip. */}
            {isLifted ? (
              <div className="mt-2">
                {card.body ? <p className="line-clamp-2 text-xs leading-5 text-slate-400">{card.body}</p> : null}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isDone
                    ? onReopen && (
                        <button type="button" onClick={() => onReopen(card.id)} className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:border-cyan-400/60 hover:text-white">
                          Put back
                        </button>
                      )
                    : onFinish && (
                        <button type="button" onClick={() => onFinish(card.id)} className="rounded-lg border border-emerald-500/50 bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25">
                          Done
                        </button>
                      )}

                  {onFile && !isDone ? (
                    <select
                      value={card.deckId ?? ""}
                      onChange={(event) => onFile(card.id, event.target.value || null)}
                      aria-label={"File " + card.title}
                      className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300"
                    >
                      <option value="">Unsorted</option>
                      {decks.map((entry) => (
                        <option key={entry.id} value={entry.id}>
                          {entry.name}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  {onRemove ? (
                    <button type="button" onClick={() => onRemove(card.id)} className="ml-auto rounded-lg border border-slate-800 px-2.5 py-1 text-xs text-slate-500 transition hover:border-rose-400/60 hover:text-rose-200">
                      Discard
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
