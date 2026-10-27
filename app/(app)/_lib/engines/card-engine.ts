import { getLocalDayKey } from "../local-day";
import { STARTER_DECKS, type CardDeck, type CardStatus, type IndexCard } from "../types/card";

// Everything a deck of index cards can do, as pure functions.
//
// Every operation returns a NEW array rather than mutating, so the storage
// hook can write the result straight back and the cloud merge sees an
// ordinary id-keyed collection.
//
// ORDERING
//
// Cards carry an explicit `order` number instead of relying on their
// position in the array. Array position cannot survive the id-based cloud
// merge - two devices that reorder differently would produce an arbitrary
// interleaving with no way to tell which was intended. A number can be
// compared, so the newest edit wins like every other field.
//
// New cards go to the FRONT (order below the current minimum), because a
// card you just wrote is the one you are thinking about.

const ORDER_STEP = 100;

export function createCardId(now: Date = new Date()): string {
  return `card-${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createDeckId(name: string, existingIds: ReadonlyArray<string>, now: Date = new Date()): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "deck";

  if (!existingIds.includes(base)) {
    return base;
  }

  return `${base}-${now.getTime().toString(36)}`;
}

function nextFrontOrder(cards: ReadonlyArray<IndexCard>): number {
  if (cards.length === 0) {
    return 0;
  }

  return Math.min(...cards.map((card) => card.order)) - ORDER_STEP;
}

// A card needs a title and nothing else. Anything that demands more than
// "write it down" at capture time defeats the purpose.
export function createCard(title: string, options: Readonly<{ deckId?: string; body?: string; cards?: ReadonlyArray<IndexCard>; now?: Date }> = {}): IndexCard {
  const now = options.now ?? new Date();
  const iso = now.toISOString();
  const trimmed = title.trim();

  return {
    id: createCardId(now),
    title: trimmed,
    body: options.body?.trim() ? options.body.trim() : undefined,
    deckId: options.deckId,
    // Captured with a deck already chosen means it was a deliberate filing,
    // not a thought thrown in the tray.
    status: options.deckId ? "active" : "inbox",
    order: nextFrontOrder(options.cards ?? []),
    createdAt: iso,
    updatedAt: iso,
  };
}

export function createDeck(name: string, accent: string, existing: ReadonlyArray<CardDeck>, now: Date = new Date()): CardDeck {
  const iso = now.toISOString();

  return {
    id: createDeckId(name, existing.map((deck) => deck.id), now),
    name: name.trim(),
    accent,
    order: existing.length === 0 ? 0 : Math.max(...existing.map((deck) => deck.order)) + ORDER_STEP,
    createdAt: iso,
    updatedAt: iso,
  };
}

export function buildStarterDecks(now: Date = new Date()): CardDeck[] {
  const decks: CardDeck[] = [];

  for (const starter of STARTER_DECKS) {
    decks.push(createDeck(starter.name, starter.accent, decks, now));
  }

  return decks;
}

function touch<T extends { updatedAt: string }>(entity: T, now: Date): T {
  return { ...entity, updatedAt: now.toISOString() };
}

// Filing a card out of the inbox. This is the whole categorise gesture:
// a card gains a deck and becomes active in one move.
export function assignCardToDeck(cards: ReadonlyArray<IndexCard>, cardId: string, deckId: string | null, now: Date = new Date()): IndexCard[] {
  return cards.map((card) => {
    if (card.id !== cardId) {
      return card;
    }

    return touch(
      {
        ...card,
        deckId: deckId ?? undefined,
        // Pulling a card back out of every deck returns it to the tray;
        // a finished card is not resurrected by refiling it.
        status: card.status === "done" ? "done" : deckId ? "active" : "inbox",
      },
      now,
    );
  });
}

export function setCardStatus(cards: ReadonlyArray<IndexCard>, cardId: string, status: CardStatus, now: Date = new Date()): IndexCard[] {
  return cards.map((card) => {
    if (card.id !== cardId) {
      return card;
    }

    return touch(
      {
        ...card,
        status,
        completedAt: status === "done" ? now.toISOString() : undefined,
        // A finished card leaves the board. Keeping it scheduled would
        // leave it sitting on a day it is no longer part of.
        scheduledDate: status === "done" ? undefined : card.scheduledDate,
      },
      now,
    );
  });
}

export function completeCard(cards: ReadonlyArray<IndexCard>, cardId: string, now: Date = new Date()): IndexCard[] {
  return setCardStatus(cards, cardId, "done", now);
}

// Undoing a completion returns the card to wherever it belongs: filed if
// it has a deck, back in the tray if it never did.
export function reopenCard(cards: ReadonlyArray<IndexCard>, cardId: string, now: Date = new Date()): IndexCard[] {
  const card = cards.find((entry) => entry.id === cardId);

  return setCardStatus(cards, cardId, card?.deckId ? "active" : "inbox", now);
}

// Dropping a card on a day, or lifting it back off. A day key, never a
// timestamp: a card is on a day the way a sticky note is on a square.
export function scheduleCard(cards: ReadonlyArray<IndexCard>, cardId: string, dayKey: string | null, now: Date = new Date()): IndexCard[] {
  return cards.map((card) => (card.id === cardId ? touch({ ...card, scheduledDate: dayKey ?? undefined }, now) : card));
}

export function updateCard(cards: ReadonlyArray<IndexCard>, cardId: string, patch: Partial<Pick<IndexCard, "title" | "body">>, now: Date = new Date()): IndexCard[] {
  return cards.map((card) => {
    if (card.id !== cardId) {
      return card;
    }

    const title = patch.title !== undefined ? patch.title.trim() : card.title;

    return touch(
      {
        ...card,
        // An empty title would leave a card with nothing readable on its
        // top strip, so the previous one stands.
        title: title || card.title,
        body: patch.body !== undefined ? (patch.body.trim() ? patch.body.trim() : undefined) : card.body,
      },
      now,
    );
  });
}

export function deleteCard(cards: ReadonlyArray<IndexCard>, cardId: string): IndexCard[] {
  return cards.filter((card) => card.id !== cardId);
}

// Moving a card to a new position in the hand. Computes an order between
// its new neighbours rather than renumbering everything, so a reorder
// touches one card and merges cleanly.
export function moveCardToIndex(cards: ReadonlyArray<IndexCard>, cardId: string, targetIndex: number, now: Date = new Date()): IndexCard[] {
  const ordered = sortCards(cards);
  const current = ordered.findIndex((card) => card.id === cardId);

  if (current === -1) {
    return cards as IndexCard[];
  }

  const without = ordered.filter((card) => card.id !== cardId);
  const clamped = Math.max(0, Math.min(targetIndex, without.length));
  const before = without[clamped - 1];
  const after = without[clamped];

  let order: number;

  if (!before && !after) {
    order = 0;
  } else if (!before) {
    order = after.order - ORDER_STEP;
  } else if (!after) {
    order = before.order + ORDER_STEP;
  } else {
    order = (before.order + after.order) / 2;
  }

  return cards.map((card) => (card.id === cardId ? touch({ ...card, order }, now) : card));
}

// Hand order first, then newest-written. createdAt only ever breaks a tie
// between two cards that genuinely share an order, which happens when the
// same card is created on two devices at once.
export function sortCards(cards: ReadonlyArray<IndexCard>): IndexCard[] {
  return [...cards].sort((left, right) => (left.order !== right.order ? left.order - right.order : right.createdAt.localeCompare(left.createdAt)));
}

export function sortDecks(decks: ReadonlyArray<CardDeck>): CardDeck[] {
  return [...decks].sort((left, right) => (left.order !== right.order ? left.order - right.order : left.name.localeCompare(right.name)));
}

// The tray: everything written down but not yet filed.
export function getInboxCards(cards: ReadonlyArray<IndexCard>): IndexCard[] {
  return sortCards(cards.filter((card) => card.status === "inbox"));
}

export function getActiveCards(cards: ReadonlyArray<IndexCard>): IndexCard[] {
  return sortCards(cards.filter((card) => card.status === "active"));
}

export function getDoneCards(cards: ReadonlyArray<IndexCard>): IndexCard[] {
  // Most recently finished first - the useful order for "what did I get
  // through", which is the only reason to look at this pile.
  return [...cards.filter((card) => card.status === "done")].sort((left, right) => (right.completedAt ?? "").localeCompare(left.completedAt ?? ""));
}

export function getCardsInDeck(cards: ReadonlyArray<IndexCard>, deckId: string, status: CardStatus = "active"): IndexCard[] {
  return sortCards(cards.filter((card) => card.deckId === deckId && card.status === status));
}

export function getCardsForDay(cards: ReadonlyArray<IndexCard>, day: Date | string): IndexCard[] {
  const dayKey = typeof day === "string" ? day : getLocalDayKey(day);

  return sortCards(cards.filter((card) => card.scheduledDate === dayKey && card.status !== "done"));
}

export function getUnscheduledActiveCards(cards: ReadonlyArray<IndexCard>): IndexCard[] {
  return sortCards(cards.filter((card) => card.status === "active" && !card.scheduledDate));
}

export type DeckSummary = Readonly<{
  deck: CardDeck;
  active: number;
  done: number;
  scheduled: number;
}>;

export function summariseDecks(decks: ReadonlyArray<CardDeck>, cards: ReadonlyArray<IndexCard>): DeckSummary[] {
  return sortDecks(decks).map((deck) => {
    const inDeck = cards.filter((card) => card.deckId === deck.id);

    return {
      deck,
      active: inDeck.filter((card) => card.status === "active").length,
      done: inDeck.filter((card) => card.status === "done").length,
      scheduled: inDeck.filter((card) => card.status === "active" && card.scheduledDate).length,
    };
  });
}

// Removing a deck never removes its cards. A category was the wrong one;
// the work written on the cards is still real. They fall back to the tray
// so they are re-filed deliberately rather than disappearing.
export function removeDeck(
  decks: ReadonlyArray<CardDeck>,
  cards: ReadonlyArray<IndexCard>,
  deckId: string,
  now: Date = new Date(),
): Readonly<{ decks: CardDeck[]; cards: IndexCard[] }> {
  return {
    decks: decks.filter((deck) => deck.id !== deckId),
    cards: cards.map((card) =>
      card.deckId === deckId ? touch({ ...card, deckId: undefined, status: card.status === "done" ? "done" : "inbox" }, now) : card,
    ),
  };
}

export function renameDeck(decks: ReadonlyArray<CardDeck>, deckId: string, name: string, accent?: string, now: Date = new Date()): CardDeck[] {
  return decks.map((deck) => {
    if (deck.id !== deckId) {
      return deck;
    }

    const trimmed = name.trim();

    return touch({ ...deck, name: trimmed || deck.name, accent: accent ?? deck.accent }, now);
  });
}
