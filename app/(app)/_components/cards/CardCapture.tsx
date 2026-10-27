"use client";

import { useState } from "react";
import type { CardDeck } from "../../_lib/types/card";

// Writing a card has to be as fast as pulling one off the stack and
// putting pen to it. One field, Enter saves. The deck picker defaults to
// "unsorted" deliberately: deciding where something belongs is a different
// act from writing it down, and making it a prerequisite is what stops
// people capturing at all.
type CardCaptureProps = Readonly<{
  decks: ReadonlyArray<CardDeck>;
  onAdd: (title: string, options?: Readonly<{ deckId?: string; body?: string }>) => void;
}>;

export default function CardCapture({ decks, onAdd }: CardCaptureProps) {
  const [title, setTitle] = useState("");
  const [deckId, setDeckId] = useState("");

  function submit() {
    if (!title.trim()) {
      return;
    }

    onAdd(title, { deckId: deckId || undefined });
    // The deck stays selected: filing several cards into the same deck in
    // a row is common, re-picking it every time is not.
    setTitle("");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submit();
          }
        }}
        placeholder="Write one thing on a card…"
        aria-label="Card title"
        data-testid="card-capture-input"
        className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-[rgb(var(--atlas-accent,168_85_247)/0.6)] focus:outline-none"
      />

      {decks.length > 0 ? (
        <select
          value={deckId}
          onChange={(event) => setDeckId(event.target.value)}
          aria-label="Deck"
          className="rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2.5 text-sm text-slate-300 focus:border-[rgb(var(--atlas-accent,168_85_247)/0.6)] focus:outline-none"
        >
          <option value="">Unsorted</option>
          {decks.map((deck) => (
            <option key={deck.id} value={deck.id}>
              {deck.name}
            </option>
          ))}
        </select>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={!title.trim()}
        className="rounded-xl border border-[rgb(var(--atlas-accent,168_85_247)/0.5)] bg-[rgb(var(--atlas-accent,168_85_247)/0.12)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.22)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add card
      </button>
    </div>
  );
}
