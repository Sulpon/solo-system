"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { WritingLogEntry } from "../types/writing-log";

export function useWritingLogEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<WritingLogEntry[]>(STORAGE_KEYS.writingLogEntries, []);

  return { entries, setEntries, hasLoaded } as const;
}
