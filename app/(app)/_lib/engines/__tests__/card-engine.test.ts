import { describe, expect, it } from "vitest";
import {
  assignCardToDeck,
  buildStarterDecks,
  completeCard,
  createCard,
  createDeck,
  deleteCard,
  getCardsForDay,
  getCardsInDeck,
  getDoneCards,
  getInboxCards,
  getUnscheduledActiveCards,
  moveCardToIndex,
  removeDeck,
  renameDeck,
  reopenCard,
  scheduleCard,
  sortCards,
  summariseDecks,
  updateCard,
} from "../card-engine";
import type { IndexCard } from "../../types/card";

const NOW = new Date("2026-10-27T09:00:00.000Z");
const LATER = new Date("2026-10-27T10:00:00.000Z");

function deckOf(name: string) {
  return createDeck(name, "bg-cyan-400", [], NOW);
}

function titles(cards: ReadonlyArray<IndexCard>) {
  return cards.map((card) => card.title);
}

describe("writing a card", () => {
  it("needs only a title", () => {
    const card = createCard("Call the dentist", { now: NOW });

    expect(card.title).toBe("Call the dentist");
    expect(card.status).toBe("inbox");
    expect(card.deckId).toBeUndefined();
  });

  it("trims the title, because a stray space is not an intention", () => {
    expect(createCard("  Buy milk  ", { now: NOW }).title).toBe("Buy milk");
  });

  it("goes to the front of the hand, since a card just written is the one on your mind", () => {
    const first = createCard("First", { now: NOW });
    const second = createCard("Second", { cards: [first], now: NOW });

    expect(sortCards([first, second])[0].title).toBe("Second");
  });

  it("is already filed when captured straight into a deck", () => {
    const card = createCard("Ship the release", { deckId: "work", now: NOW });

    expect(card.status).toBe("active");
    expect(card.deckId).toBe("work");
  });

  it("drops an empty body rather than storing whitespace", () => {
    expect(createCard("Title", { body: "   ", now: NOW }).body).toBeUndefined();
  });
});

describe("filing a card", () => {
  it("moves it out of the tray and into a deck in one gesture", () => {
    const card = createCard("Fix the sink", { now: NOW });
    const [filed] = assignCardToDeck([card], card.id, "home", LATER);

    expect(filed.deckId).toBe("home");
    expect(filed.status).toBe("active");
    expect(filed.updatedAt).toBe(LATER.toISOString());
  });

  it("returns it to the tray when pulled out of every deck", () => {
    const card = createCard("Fix the sink", { deckId: "home", now: NOW });
    const [unfiled] = assignCardToDeck([card], card.id, null, LATER);

    expect(unfiled.deckId).toBeUndefined();
    expect(unfiled.status).toBe("inbox");
  });

  it("does not resurrect a finished card by refiling it", () => {
    const card = createCard("Done thing", { deckId: "work", now: NOW });
    const [finished] = completeCard([card], card.id, NOW);
    const [refiled] = assignCardToDeck([finished], card.id, "home", LATER);

    expect(refiled.status).toBe("done");
    expect(refiled.deckId).toBe("home");
  });
});

describe("finishing a card", () => {
  it("records when it was finished", () => {
    const card = createCard("Write the report", { deckId: "work", now: NOW });
    const [done] = completeCard([card], card.id, LATER);

    expect(done.status).toBe("done");
    expect(done.completedAt).toBe(LATER.toISOString());
  });

  it("takes it off the board, so it does not sit on a day it is no longer part of", () => {
    const card = createCard("Write the report", { deckId: "work", now: NOW });
    const scheduled = scheduleCard([card], card.id, "2026-10-28", NOW);
    const [done] = completeCard(scheduled, card.id, LATER);

    expect(done.scheduledDate).toBeUndefined();
  });

  it("reopens to its deck when it has one", () => {
    const card = createCard("Write the report", { deckId: "work", now: NOW });
    const done = completeCard([card], card.id, NOW);
    const [reopened] = reopenCard(done, card.id, LATER);

    expect(reopened.status).toBe("active");
    expect(reopened.completedAt).toBeUndefined();
  });

  it("reopens to the tray when it never had a deck", () => {
    const card = createCard("Stray thought", { now: NOW });
    const done = completeCard([card], card.id, NOW);
    const [reopened] = reopenCard(done, card.id, LATER);

    expect(reopened.status).toBe("inbox");
  });
});

describe("putting cards on the board", () => {
  it("places a card on a day", () => {
    const card = createCard("Gym", { deckId: "training", now: NOW });
    const [scheduled] = scheduleCard([card], card.id, "2026-10-28", LATER);

    expect(scheduled.scheduledDate).toBe("2026-10-28");
  });

  it("lifts it back off", () => {
    const card = createCard("Gym", { deckId: "training", now: NOW });
    const scheduled = scheduleCard([card], card.id, "2026-10-28", NOW);
    const [lifted] = scheduleCard(scheduled, card.id, null, LATER);

    expect(lifted.scheduledDate).toBeUndefined();
  });

  it("finds the cards sitting on a given day", () => {
    const a = createCard("A", { deckId: "work", now: NOW });
    const b = createCard("B", { deckId: "work", cards: [a], now: NOW });
    const cards = scheduleCard(scheduleCard([a, b], a.id, "2026-10-28", NOW), b.id, "2026-10-29", NOW);

    expect(titles(getCardsForDay(cards, "2026-10-28"))).toEqual(["A"]);
  });

  it("never shows a finished card on a day", () => {
    const card = createCard("A", { deckId: "work", now: NOW });
    const scheduled = scheduleCard([card], card.id, "2026-10-28", NOW);
    const done = completeCard(scheduled, card.id, NOW);

    expect(getCardsForDay(done, "2026-10-28")).toHaveLength(0);
  });

  it("lists active cards that are not on the board yet", () => {
    const a = createCard("A", { deckId: "work", now: NOW });
    const b = createCard("B", { deckId: "work", cards: [a], now: NOW });
    const cards = scheduleCard([a, b], a.id, "2026-10-28", NOW);

    expect(titles(getUnscheduledActiveCards(cards))).toEqual(["B"]);
  });
});

describe("rearranging the hand", () => {
  it("moves a card to the front", () => {
    const a = createCard("A", { now: NOW });
    const b = createCard("B", { cards: [a], now: NOW });
    const c = createCard("C", { cards: [a, b], now: NOW });
    // Front-insertion means the natural order is C, B, A.
    const moved = moveCardToIndex([a, b, c], a.id, 0, LATER);

    expect(titles(sortCards(moved))).toEqual(["A", "C", "B"]);
  });

  it("moves a card to the back", () => {
    const a = createCard("A", { now: NOW });
    const b = createCard("B", { cards: [a], now: NOW });
    const c = createCard("C", { cards: [a, b], now: NOW });
    const moved = moveCardToIndex([a, b, c], c.id, 2, LATER);

    expect(titles(sortCards(moved))).toEqual(["B", "A", "C"]);
  });

  it("touches only the card that moved, so a reorder merges cleanly", () => {
    const a = createCard("A", { now: NOW });
    const b = createCard("B", { cards: [a], now: NOW });
    const moved = moveCardToIndex([a, b], a.id, 0, LATER);

    expect(moved.find((card) => card.id === b.id)?.updatedAt).toBe(b.updatedAt);
  });

  it("is a no-op for a card that is not there", () => {
    const a = createCard("A", { now: NOW });

    expect(moveCardToIndex([a], "nope", 0, LATER)).toEqual([a]);
  });
});

describe("decks", () => {
  it("offers starter decks so the first screen is not an empty box", () => {
    const decks = buildStarterDecks(NOW);

    expect(decks.map((deck) => deck.name)).toEqual(["Work", "Training", "Home", "Relationships"]);
    expect(new Set(decks.map((deck) => deck.id)).size).toBe(4);
  });

  it("builds a readable id from the name", () => {
    expect(deckOf("Side Projects").id).toBe("side-projects");
  });

  it("does not collide when two decks share a name", () => {
    const first = deckOf("Work");
    const second = createDeck("Work", "bg-rose-400", [first], NOW);

    expect(second.id).not.toBe(first.id);
  });

  it("counts what is in each deck", () => {
    const deck = deckOf("Work");
    const a = createCard("A", { deckId: deck.id, now: NOW });
    const b = createCard("B", { deckId: deck.id, cards: [a], now: NOW });
    const withDone = completeCard([a, b], b.id, NOW);

    const [summary] = summariseDecks([deck], withDone);

    expect(summary.active).toBe(1);
    expect(summary.done).toBe(1);
  });

  it("renames without disturbing anything else", () => {
    const deck = deckOf("Work");
    const [renamed] = renameDeck([deck], deck.id, "Deep Work", undefined, LATER);

    expect(renamed.name).toBe("Deep Work");
    expect(renamed.accent).toBe(deck.accent);
    expect(renamed.id).toBe(deck.id);
  });

  it("keeps the cards when a deck is removed - the category was wrong, the work is not", () => {
    const deck = deckOf("Work");
    const card = createCard("Still needs doing", { deckId: deck.id, now: NOW });

    const result = removeDeck([deck], [card], deck.id, LATER);

    expect(result.decks).toHaveLength(0);
    expect(result.cards).toHaveLength(1);
    expect(result.cards[0].deckId).toBeUndefined();
    expect(result.cards[0].status).toBe("inbox");
  });

  it("leaves finished cards finished when their deck is removed", () => {
    const deck = deckOf("Work");
    const card = createCard("Already done", { deckId: deck.id, now: NOW });
    const done = completeCard([card], card.id, NOW);

    expect(removeDeck([deck], done, deck.id, LATER).cards[0].status).toBe("done");
  });
});

describe("the three piles", () => {
  it("separates tray, filed and finished", () => {
    const loose = createCard("Unsorted thought", { now: NOW });
    const filed = createCard("Filed", { deckId: "work", cards: [loose], now: NOW });
    const finished = createCard("Finished", { deckId: "work", cards: [loose, filed], now: NOW });
    const cards = completeCard([loose, filed, finished], finished.id, NOW);

    expect(titles(getInboxCards(cards))).toEqual(["Unsorted thought"]);
    expect(titles(getCardsInDeck(cards, "work"))).toEqual(["Filed"]);
    expect(titles(getDoneCards(cards))).toEqual(["Finished"]);
  });

  it("shows the most recently finished card first", () => {
    const a = createCard("A", { deckId: "work", now: NOW });
    const b = createCard("B", { deckId: "work", cards: [a], now: NOW });
    const done = completeCard(completeCard([a, b], a.id, NOW), b.id, LATER);

    expect(titles(getDoneCards(done))).toEqual(["B", "A"]);
  });

  it("keeps finished cards grouped by their deck", () => {
    const card = createCard("Finished work card", { deckId: "work", now: NOW });
    const done = completeCard([card], card.id, NOW);

    expect(titles(getCardsInDeck(done, "work", "done"))).toEqual(["Finished work card"]);
  });
});

describe("editing and removing", () => {
  it("edits the title and body", () => {
    const card = createCard("Old", { now: NOW });
    const [edited] = updateCard([card], card.id, { title: "New", body: "Detail" }, LATER);

    expect(edited.title).toBe("New");
    expect(edited.body).toBe("Detail");
  });

  it("refuses to blank the title, which would leave the card unreadable", () => {
    const card = createCard("Keep me", { now: NOW });
    const [edited] = updateCard([card], card.id, { title: "   " }, LATER);

    expect(edited.title).toBe("Keep me");
  });

  it("clears the body when emptied", () => {
    const card = createCard("Title", { body: "Something", now: NOW });
    const [edited] = updateCard([card], card.id, { body: "" }, LATER);

    expect(edited.body).toBeUndefined();
  });

  it("removes only the named card", () => {
    const a = createCard("A", { now: NOW });
    const b = createCard("B", { cards: [a], now: NOW });

    expect(titles(deleteCard([a, b], a.id))).toEqual(["B"]);
  });
});
