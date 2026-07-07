"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { FocusHistoryEntry } from "../types/focus";

export function useFocusHistory() {
  const [history, setHistory, hasLoaded] = useLocalStorageState<FocusHistoryEntry[]>(STORAGE_KEYS.focusHistory, []);

  function addHistoryEntry(entry: FocusHistoryEntry) {
    setHistory((current) => [...current, entry].sort((first, second) => new Date(first.start).getTime() - new Date(second.start).getTime()));
  }

  return { history, hasLoaded, addHistoryEntry } as const;
}
