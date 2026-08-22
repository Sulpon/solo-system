"use client";

import { createContext, useCallback, useMemo, useState } from "react";
import type { CelebrationPayload } from "./types/celebration";

export type CelebrationDraft = Omit<CelebrationPayload, "id" | "createdAt"> & Partial<Pick<CelebrationPayload, "id" | "createdAt">>;

export type CelebrationStoreValue = Readonly<{
  queue: ReadonlyArray<CelebrationPayload>;
  active: CelebrationPayload | null;
  enqueueCelebration: (payload: CelebrationDraft) => void;
  dismissActive: () => void;
}>;

export const CelebrationContext = createContext<CelebrationStoreValue | null>(null);

function generateCelebrationId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "celebration-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

// Deliberately in-memory, not persisted - celebrations are a live, in-session
// thing. Permanent history lives in activityEvents / the reward collection,
// which the watcher effect writes to regardless of whether this queue is
// even mounted, so nothing is lost if a celebration is missed.
export function CelebrationProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [queue, setQueue] = useState<CelebrationPayload[]>([]);

  const enqueueCelebration = useCallback((payload: CelebrationDraft) => {
    setQueue((current) => [
      ...current,
      {
        ...payload,
        id: payload.id ?? generateCelebrationId(),
        createdAt: payload.createdAt ?? new Date().toISOString(),
      },
    ]);
  }, []);

  const dismissActive = useCallback(() => {
    setQueue((current) => current.slice(1));
  }, []);

  const value = useMemo(
    (): CelebrationStoreValue => ({
      queue,
      active: queue[0] ?? null,
      enqueueCelebration,
      dismissActive,
    }),
    [queue, enqueueCelebration, dismissActive],
  );

  return <CelebrationContext.Provider value={value}>{children}</CelebrationContext.Provider>;
}
