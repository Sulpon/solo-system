"use client";

import { useState } from "react";
import { DECK_ACCENTS, type CardDeck } from "../../_lib/types/card";
import type { DeckSummary } from "../../_lib/engines/card-engine";

// Creating, renaming and removing decks.
//
// Removal says plainly that the cards survive, because the obvious fear -
// "will this delete my work" - is the reason people never reorganise.
type DeckManagerProps = Readonly<{
  decks: ReadonlyArray<CardDeck>;
  summaries: ReadonlyArray<DeckSummary>;
  onAdd: (name: string, accent: string) => void;
  onRename: (deckId: string, name: string, accent?: string) => void;
  onRemove: (deckId: string) => void;
}>;

export default function DeckManager({ decks, summaries, onAdd, onRename, onRemove }: DeckManagerProps) {
  const [name, setName] = useState("");
  const [accent, setAccent] = useState(DECK_ACCENTS[0].value);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) {
      return;
    }

    onAdd(name, accent);
    setName("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="New deck name…"
          aria-label="New deck name"
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2 text-sm text-white placeholder:text-slate-600 focus:border-[rgb(var(--atlas-accent,168_85_247)/0.6)] focus:outline-none"
        />

        <select
          value={accent}
          onChange={(event) => setAccent(event.target.value)}
          aria-label="Deck colour"
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-300"
        >
          {DECK_ACCENTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={submit}
          disabled={!name.trim()}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 transition hover:border-[rgb(var(--atlas-accent,168_85_247)/0.6)] hover:text-white disabled:opacity-40"
        >
          Add deck
        </button>
      </div>

      <div className="space-y-2">
        {decks.map((deck) => {
          const summary = summaries.find((entry) => entry.deck.id === deck.id);
          const total = (summary?.active ?? 0) + (summary?.done ?? 0);

          return (
            <div key={deck.id} className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={"h-3 w-3 shrink-0 rounded-full " + deck.accent} aria-hidden />

                <input
                  defaultValue={deck.name}
                  onBlur={(event) => onRename(deck.id, event.target.value)}
                  aria-label={"Rename " + deck.name}
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-white hover:border-slate-700 focus:border-[rgb(var(--atlas-accent,168_85_247)/0.6)] focus:outline-none"
                />

                <select
                  value={deck.accent}
                  onChange={(event) => onRename(deck.id, deck.name, event.target.value)}
                  aria-label={deck.name + " colour"}
                  className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-300"
                >
                  {DECK_ACCENTS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {confirmingId === deck.id ? null : (
                  <button
                    type="button"
                    onClick={() => setConfirmingId(deck.id)}
                    className="rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-400 transition hover:border-rose-400/60 hover:text-rose-200"
                  >
                    Remove
                  </button>
                )}
              </div>

              {confirmingId === deck.id ? (
                <div className="mt-3 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3">
                  <p className="text-sm text-rose-100">
                    Remove {deck.name}?{" "}
                    {total > 0 ? `Its ${total} card${total === 1 ? "" : "s"} are kept and go back to the inbox to be re-filed.` : "It has no cards."}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onRemove(deck.id);
                        setConfirmingId(null);
                      }}
                      className="rounded-lg border border-rose-400/50 bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-50 transition hover:bg-rose-500/30"
                    >
                      Remove deck
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingId(null)}
                      className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
