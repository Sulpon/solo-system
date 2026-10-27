"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import CardStack from "./CardStack";
import CardCapture from "./CardCapture";
import CardWeekBoard from "./CardWeekBoard";
import DeckManager from "./DeckManager";
import { useCards } from "../../_lib/hooks/useCards";
import { getCardsInDeck, getDoneCards, getInboxCards, summariseDecks } from "../../_lib/engines/card-engine";

// Three places a card can be, and nothing else:
//
//   Inbox    written down, not yet filed. The tray by the door.
//   Library  filed into a deck, waiting or scheduled.
//   Done     finished, still grouped by the deck it came from, because
//            "what did I get through in Training this month" is the only
//            question worth asking of a finished pile.
//
// Capture is on every tab on purpose. A thought arrives while you are
// looking at something else, and anything that makes you navigate first
// loses the thought.

type Tab = "inbox" | "week" | "library" | "done";

const TABS: ReadonlyArray<Readonly<{ id: Tab; label: string }>> = [
  { id: "inbox", label: "Inbox" },
  { id: "week", label: "Week" },
  { id: "library", label: "Library" },
  { id: "done", label: "Done" },
];

export default function CardsPageClient() {
  const { cards, decks, hasLoaded, addCard, fileCard, finishCard, unfinishCard, placeCard, removeCard, addDeck, addStarterDecks, editDeck, removeDeck } = useCards();
  const [tab, setTab] = useState<Tab>("inbox");
  const [isManagingDecks, setIsManagingDecks] = useState(false);

  const inbox = useMemo(() => getInboxCards(cards), [cards]);
  const done = useMemo(() => getDoneCards(cards), [cards]);
  const summaries = useMemo(() => summariseDecks(decks, cards), [cards, decks]);

  if (!hasLoaded) {
    return <p className="text-sm text-slate-400">Loading cards…</p>;
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="atlas-accent text-xs font-semibold uppercase tracking-[0.22em]">Index Cards</p>
        <h1 className="atlas-display mt-2 text-3xl font-black text-white">The Deck</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-400">
          One task per card. Write it down, file it into a deck, go through the hand each day and decide what actually gets done.
        </p>

        <div className="mt-5">
          <CardCapture decks={decks} onAdd={addCard} />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TABS.map((entry) => {
            const count =
              entry.id === "inbox"
                ? inbox.length
                : entry.id === "done"
                  ? done.length
                  : entry.id === "week"
                    ? cards.filter((card) => card.status === "active" && card.scheduledDate).length
                    : cards.filter((card) => card.status === "active").length;

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                className={
                  "rounded-xl border px-4 py-2 text-sm transition " +
                  (tab === entry.id
                    ? "border-[rgb(var(--atlas-accent,168_85_247)/0.6)] bg-[rgb(var(--atlas-accent,168_85_247)/0.15)] text-white"
                    : "border-slate-700 bg-slate-950/45 text-slate-300 hover:border-[rgb(var(--atlas-accent,168_85_247)/0.5)] hover:text-white")
                }
              >
                {entry.label}
                <span className="ml-2 text-xs text-slate-500">{count}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {tab === "inbox" ? (
        <Card className="p-5" testId="cards-inbox">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="atlas-display text-xl font-black text-white">Unsorted</h2>
            <p className="text-xs text-slate-500">Everything written down but not yet filed.</p>
          </div>

          <div className="mt-4">
            <CardStack
              cards={inbox}
              decks={decks}
              onFinish={finishCard}
              onFile={fileCard}
              onRemove={removeCard}
              emptyMessage="Nothing waiting. Write a card above and it lands here."
              testId="inbox-stack"
            />
          </div>
        </Card>
      ) : null}

      {tab === "week" ? (
        <Card className="p-5" testId="cards-week">
          <CardWeekBoard cards={cards} decks={decks} onPlace={placeCard} onFinish={finishCard} />
        </Card>
      ) : null}

      {tab === "library" ? (
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="atlas-display text-xl font-black text-white">Decks</h2>
                <p className="mt-1 text-xs text-slate-500">Categories that match your life, not a product&apos;s idea of one.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsManagingDecks((current) => !current)}
                className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-[rgb(var(--atlas-accent,168_85_247)/0.6)] hover:text-white"
              >
                {isManagingDecks ? "Done editing" : "Manage decks"}
              </button>
            </div>

            {isManagingDecks ? (
              <div className="mt-4">
                <DeckManager decks={decks} summaries={summaries} onAdd={addDeck} onRename={editDeck} onRemove={removeDeck} />
              </div>
            ) : null}
          </Card>

          {decks.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-slate-400">No decks yet. Start with the usual four, or make your own above.</p>
              <button
                type="button"
                onClick={addStarterDecks}
                className="mt-4 rounded-xl border border-[rgb(var(--atlas-accent,168_85_247)/0.5)] bg-[rgb(var(--atlas-accent,168_85_247)/0.12)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.2)]"
              >
                Add Work, Training, Home, Relationships
              </button>
            </Card>
          ) : null}

          {summaries.map(({ deck, active, scheduled }) => (
            <Card key={deck.id} className="p-5" testId={"deck-" + deck.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={"h-3 w-3 rounded-full " + deck.accent} aria-hidden />
                  <h2 className="atlas-display text-xl font-black text-white">{deck.name}</h2>
                </div>
                <p className="text-xs text-slate-500">
                  {active} in hand{scheduled > 0 ? ` · ${scheduled} on the board` : ""}
                </p>
              </div>

              <div className="mt-4">
                <CardStack
                  cards={getCardsInDeck(cards, deck.id)}
                  decks={decks}
                  onFinish={finishCard}
                  onFile={fileCard}
                  onRemove={removeCard}
                  emptyMessage="This deck is empty."
                />
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "done" ? (
        <div className="space-y-5">
          {decks.map((deck) => {
            const finished = getCardsInDeck(cards, deck.id, "done");

            if (finished.length === 0) {
              return null;
            }

            return (
              <Card key={deck.id} className="p-5">
                <div className="flex items-center gap-2">
                  <span className={"h-3 w-3 rounded-full " + deck.accent} aria-hidden />
                  <h2 className="atlas-display text-xl font-black text-white">{deck.name}</h2>
                  <span className="text-xs text-slate-500">{finished.length} finished</span>
                </div>

                <div className="mt-4">
                  <CardStack cards={finished} decks={decks} onReopen={unfinishCard} onRemove={removeCard} emptyMessage="" />
                </div>
              </Card>
            );
          })}

          {/* Finished cards that never belonged to a deck still have to go
              somewhere, or they would vanish from the record entirely. */}
          {(() => {
            const loose = done.filter((card) => !card.deckId);

            if (loose.length === 0) {
              return null;
            }

            return (
              <Card className="p-5">
                <h2 className="atlas-display text-xl font-black text-white">Unsorted</h2>
                <div className="mt-4">
                  <CardStack cards={loose} decks={decks} onReopen={unfinishCard} onRemove={removeCard} emptyMessage="" />
                </div>
              </Card>
            );
          })()}

          {done.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-sm text-slate-400">Nothing finished yet.</p>
            </Card>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
