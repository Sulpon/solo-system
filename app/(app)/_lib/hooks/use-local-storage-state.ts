"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MENACE_STORAGE_EVENT } from "../storage-keys";
import { recordCollectionDeletions } from "../sync/deletion-tombstones";

type StoredStateAction<T> = T | ((current: T) => T);

function readStoredValue<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);

  if (!stored) {
    return fallback;
  }

  try {
    return JSON.parse(stored) as T;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function notifyStorageChange(key: string) {
  queueMicrotask(() => {
    window.dispatchEvent(new CustomEvent(MENACE_STORAGE_EVENT, { detail: { key } }));
  });
}

function isSameValue<T>(current: T, next: T) {
  if (Object.is(current, next)) {
    return true;
  }

  if (typeof current === "object" && current !== null && typeof next === "object" && next !== null) {
    return JSON.stringify(current) === JSON.stringify(next);
  }

  return false;
}

export function useLocalStorageState<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(fallback);
  const valueRef = useRef(value);
  const fallbackRef = useRef(fallback);
  const hasLoadedRef = useRef(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    fallbackRef.current = fallback;
  }, [fallback]);

  useEffect(() => {
    function syncValue() {
      const next = readStoredValue(key, fallbackRef.current);

      if (isSameValue(valueRef.current, next)) {
        if (!hasLoadedRef.current) {
          hasLoadedRef.current = true;
          setHasLoaded(true);
        }

        return;
      }

      valueRef.current = next;
      setValue(next);
      hasLoadedRef.current = true;
      setHasLoaded(true);
    }

    function syncFromCustomEvent(event: Event) {
      const customEvent = event as CustomEvent<{ key?: string }>;

      if (!customEvent.detail?.key || customEvent.detail.key === key) {
        syncValue();
      }
    }

    function syncFromStorage(event: StorageEvent) {
      if (!event.key || event.key === key) {
        syncValue();
      }
    }

    syncValue();
    window.addEventListener(MENACE_STORAGE_EVENT, syncFromCustomEvent);
    window.addEventListener("storage", syncFromStorage);

    return () => {
      window.removeEventListener(MENACE_STORAGE_EVENT, syncFromCustomEvent);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, [key]);

  const setStoredValue = useCallback(
    (action: StoredStateAction<T>) => {
      const current = valueRef.current;
      const next = typeof action === "function" ? (action as (current: T) => T)(current) : action;

      const previousRaw = window.localStorage.getItem(key);

      valueRef.current = next;
      window.localStorage.setItem(key, JSON.stringify(next));
      recordCollectionDeletions(key, previousRaw, next);
      setValue(next);
      notifyStorageChange(key);
    },
    [key],
  );

  const resetStoredValue = useCallback(() => {
    const previousRaw = window.localStorage.getItem(key);

    valueRef.current = fallbackRef.current;
    window.localStorage.removeItem(key);
    // Clearing a whole collection is still a deletion of every entity in
    // it. Without this, removing the key locally would simply be refilled
    // from the cloud on the next merge, because a missing key reads as
    // "this device never had it".
    recordCollectionDeletions(key, previousRaw, fallbackRef.current);
    setValue(fallbackRef.current);
    notifyStorageChange(key);
  }, [key]);

  return [value, setStoredValue, hasLoaded, resetStoredValue] as const;
}
