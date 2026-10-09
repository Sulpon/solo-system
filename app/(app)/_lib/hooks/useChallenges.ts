"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { getLocalDayKey, parseLocalDayKey } from "../local-day";
import { isReadableChallenge, partitionChallenges } from "../engines/challenge-engine";
import type { Challenge, ChallengeReview } from "../types/challenge";

function generateChallengeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "challenge-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

function addDaysToDayKey(dayKey: string, days: number): string {
  const date = parseLocalDayKey(dayKey);
  date.setDate(date.getDate() + days);
  return getLocalDayKey(date);
}

export type ChallengeDraft = Readonly<{
  title: string;
  description?: string;
  icon: string;
  category: string;
  tags?: ReadonlyArray<string>;
  startDate: string;
  durationDays: number;
}>;

export function useChallenges() {
  // Stored as unknown[] deliberately: localStorage may still hold records
  // from the pre-redesign Challenge shape, and typing them as Challenge is
  // what let an undefined startDate reach parseLocalDayKey and crash the
  // page. Mutations below all map over this RAW array, so holding a record
  // back from the UI never removes it from storage.
  const [storedChallenges, setChallenges, hasLoaded] = useLocalStorageState<unknown[]>(STORAGE_KEYS.challenges, []);
  const { readable: challenges, unreadable: unreadableChallenges } = useMemo(() => partitionChallenges(storedChallenges), [storedChallenges]);

  const mapChallenge = useCallback(
    (id: string, transform: (challenge: Challenge) => Challenge) =>
      setChallenges((current) => current.map((entry) => (isReadableChallenge(entry) && entry.id === id ? transform(entry) : entry))),
    [setChallenges],
  );

  const createChallenge = useCallback(
    (draft: ChallengeDraft, status: "draft" | "active" = "active") => {
      const now = new Date().toISOString();
      const challenge: Challenge = {
        id: generateChallengeId(),
        title: draft.title,
        description: draft.description,
        icon: draft.icon,
        category: draft.category,
        tags: draft.tags,
        status,
        startDate: draft.startDate,
        endDate: addDaysToDayKey(draft.startDate, draft.durationDays - 1),
        durationDays: draft.durationDays,
        createdAt: now,
      };

      setChallenges((current) => [...current, challenge]);
      return challenge;
    },
    [setChallenges],
  );

  const updateChallenge = useCallback(
    (id: string, patch: Partial<Pick<Challenge, "title" | "description" | "icon" | "category" | "tags">>) => {
      mapChallenge(id, (challenge) => ({ ...challenge, ...patch }));
    },
    [mapChallenge],
  );

  // Only a draft challenge can be (re)started - once active, startDate/
  // endDate/durationDays are fixed per the product spec ("once started, the
  // duration should remain fixed").
  const startChallenge = useCallback(
    (id: string, startDate: string = getLocalDayKey()) => {
      mapChallenge(id, (challenge) =>
        challenge.status === "draft" ? { ...challenge, status: "active", startDate, endDate: addDaysToDayKey(startDate, challenge.durationDays - 1) } : challenge,
      );
    },
    [mapChallenge],
  );

  const completeChallenge = useCallback(
    (id: string) => {
      mapChallenge(id, (challenge) => (challenge.status === "active" ? { ...challenge, status: "completed", completedAt: new Date().toISOString() } : challenge));
    },
    [mapChallenge],
  );

  const abandonChallenge = useCallback(
    (id: string) => {
      mapChallenge(id, (challenge) => (challenge.status === "active" || challenge.status === "draft" ? { ...challenge, status: "abandoned" } : challenge));
    },
    [mapChallenge],
  );

  const saveReview = useCallback(
    (id: string, review: Omit<ChallengeReview, "completedAt">) => {
      mapChallenge(id, (challenge) => ({ ...challenge, review: { ...review, completedAt: new Date().toISOString() } }));
    },
    [mapChallenge],
  );

  const deleteChallenge = useCallback(
    (id: string) => {
      setChallenges((current) => current.filter((entry) => !(typeof entry === "object" && entry !== null && (entry as { id?: unknown }).id === id)));
    },
    [setChallenges],
  );

  return { challenges, unreadableChallenges, createChallenge, updateChallenge, startChallenge, completeChallenge, abandonChallenge, saveReview, deleteChallenge, hasLoaded } as const;
}
