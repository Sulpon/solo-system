"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { TradeLogEntry } from "../types/trade-log";

export function useTradeLogEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<TradeLogEntry[]>(STORAGE_KEYS.tradeLogEntries, []);

  return { entries, setEntries, hasLoaded } as const;
}
