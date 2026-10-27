"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import {
  assignCardToDeck,
  buildStarterDecks,
  completeCard,
  createCard,
  createDeck,
  deleteCard,
  moveCardToIndex,
  removeDeck,
  renameDeck,
  reopenCard,
  scheduleCard,
  sortDecks,
  updateCard,
} from "../engines/card-engine";
import type { CardDeck, IndexCard } from "../types/card";

// The only writer for cards and decks.
//
// Every mutation goes through card-engine, which is pure and tested - this
// hook does nothing but hand the current array in and persist what comes
// back. Deleting a card or a deck writes through use-local-storage-state,
// so it is tombstoned and the deletion actually sticks across devices
// (sync/deletion-tombstones.ts).
//
// Starter decks are deliberately NOT created here. Seeding on read would
// mean every device that has never opened this page quietly writes four
// rows, including one that is only syncing in the background - the user
// asks for them, from the UI, once.
export function useCards() {
  const [cards, setCards, hasCardsLoaded] = useLocalStorageState<IndexCard[]>(STORAGE_KEYS.cards, []);
  const [storedDecks, setDecks, hasDecksLoaded] = useLocalStorageState<CardDeck[]>(STORAGE_KEYS.cardDecks, []);

  const decks = useMemo(() => sortDecks(storedDecks), [storedDecks]);

  const addCard = useCallback(
    (title: string, options: Readonly<{ deckId?: string; body?: string }> = {}) => {
      if (!title.trim()) {
        return;
      }

      setCards((current) => [...current, createCard(title, { ...options, cards: current })]);
    },
    [setCards],
  );

  const fileCard = useCallback((cardId: string, deckId: string | null) => setCards((current) => assignCardToDeck(current, cardId, deckId)), [setCards]);
  const finishCard = useCallback((cardId: string) => setCards((current) => completeCard(current, cardId)), [setCards]);
  const unfinishCard = useCallback((cardId: string) => setCards((current) => reopenCard(current, cardId)), [setCards]);
  const placeCard = useCallback((cardId: string, dayKey: string | null) => setCards((current) => scheduleCard(current, cardId, dayKey)), [setCards]);
  const editCard = useCallback(
    (cardId: string, patch: Partial<Pick<IndexCard, "title" | "body">>) => setCards((current) => updateCard(current, cardId, patch)),
    [setCards],
  );
  const removeCard = useCallback((cardId: string) => setCards((current) => deleteCard(current, cardId)), [setCards]);
  const reorderCard = useCallback((cardId: string, targetIndex: number) => setCards((current) => moveCardToIndex(current, cardId, targetIndex)), [setCards]);

  const addDeck = useCallback(
    (name: string, accent: string) => {
      if (!name.trim()) {
        return;
      }

      setDecks((current) => [...current, createDeck(name, accent, current)]);
    },
    [setDecks],
  );

  const addStarterDecks = useCallback(() => {
    setDecks((current) => {
      if (current.length > 0) {
        return current;
      }

      // Built against the growing list so each starter gets a distinct
      // order, which buildStarterDecks already handles.
      return buildStarterDecks();
    });
  }, [setDecks]);

  const editDeck = useCallback((deckId: string, name: string, accent?: string) => setDecks((current) => renameDeck(current, deckId, name, accent)), [setDecks]);

  // Removing a deck touches both collections, and the cards must be
  // rewritten before the deck disappears or they would briefly reference
  // a deck that no longer exists.
  const removeDeckAndRelease = useCallback(
    (deckId: string) => {
      setCards((currentCards) => removeDeck(storedDecks, currentCards, deckId).cards);
      setDecks((currentDecks) => removeDeck(currentDecks, [], deckId).decks);
    },
    [setCards, setDecks, storedDecks],
  );

  return {
    cards,
    decks,
    hasLoaded: hasCardsLoaded && hasDecksLoaded,
    addCard,
    fileCard,
    finishCard,
    unfinishCard,
    placeCard,
    editCard,
    removeCard,
    reorderCard,
    addDeck,
    addStarterDecks,
    editDeck,
    removeDeck: removeDeckAndRelease,
  } as const;
}
