"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { getLocalDayKey, parseLocalDayKey } from "../local-day";
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
  const [challenges, setChallenges, hasLoaded] = useLocalStorageState<Challenge[]>(STORAGE_KEYS.challenges, []);

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
      setChallenges((current) => current.map((challenge) => (challenge.id === id ? { ...challenge, ...patch } : challenge)));
    },
    [setChallenges],
  );

  // Only a draft challenge can be (re)started - once active, startDate/
  // endDate/durationDays are fixed per the product spec ("once started, the
  // duration should remain fixed").
  const startChallenge = useCallback(
    (id: string, startDate: string = getLocalDayKey()) => {
      setChallenges((current) =>
        current.map((challenge) =>
          challenge.id === id && challenge.status === "draft"
            ? { ...challenge, status: "active", startDate, endDate: addDaysToDayKey(startDate, challenge.durationDays - 1) }
            : challenge,
        ),
      );
    },
    [setChallenges],
  );

  const completeChallenge = useCallback(
    (id: string) => {
      setChallenges((current) =>
        current.map((challenge) => (challenge.id === id && challenge.status === "active" ? { ...challenge, status: "completed", completedAt: new Date().toISOString() } : challenge)),
      );
    },
    [setChallenges],
  );

  const abandonChallenge = useCallback(
    (id: string) => {
      setChallenges((current) => current.map((challenge) => (challenge.id === id && (challenge.status === "active" || challenge.status === "draft") ? { ...challenge, status: "abandoned" } : challenge)));
    },
    [setChallenges],
  );

  const saveReview = useCallback(
    (id: string, review: Omit<ChallengeReview, "completedAt">) => {
      setChallenges((current) => current.map((challenge) => (challenge.id === id ? { ...challenge, review: { ...review, completedAt: new Date().toISOString() } } : challenge)));
    },
    [setChallenges],
  );

  const deleteChallenge = useCallback(
    (id: string) => {
      setChallenges((current) => current.filter((challenge) => challenge.id !== id));
    },
    [setChallenges],
  );

  return { challenges, createChallenge, updateChallenge, startChallenge, completeChallenge, abandonChallenge, saveReview, deleteChallenge, hasLoaded } as const;
}
