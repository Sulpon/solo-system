"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChallenges } from "./useChallenges";
import { useChallengeMetrics } from "./useChallengeMetrics";
import { useChallengeEntries } from "./useChallengeEntries";
import { useProgression } from "./useProgression";
import { createChallengeCompletedActivityEvent } from "../activity-events";
import { isChallengePastEndDate } from "../engines/challenge-mission-engine";

// Aggregates one Challenge with its metrics/entries, and owns the single
// state transition this feature has: active -> completed once the end date
// has passed. The transition is idempotent (re-checked on every load, but
// only ever fires once because updating status persists immediately), and
// fires exactly one lightweight activity event - no XP, no other side
// effects. See createChallengeCompletedActivityEvent.
export function useChallenge(challengeId: string) {
  const { challenges, updateChallenge, startChallenge, completeChallenge, abandonChallenge, saveReview, deleteChallenge, hasLoaded: challengesLoaded } = useChallenges();
  const { getMetricsForChallenge, addMetric, updateMetric, deleteMetric, moveMetric, deleteMetricsForChallenge, hasLoaded: metricsLoaded } = useChallengeMetrics();
  const { getEntriesForChallenge, setEntryValue, setEntryPhoto, deleteEntriesForChallenge, hasLoaded: entriesLoaded } = useChallengeEntries();
  const { addActivityEvents } = useProgression();

  const challenge = challenges.find((item) => item.id === challengeId) ?? null;
  const challengeMetrics = useMemo(() => getMetricsForChallenge(challengeId), [getMetricsForChallenge, challengeId]);
  const challengeEntries = useMemo(() => getEntriesForChallenge(challengeId), [getEntriesForChallenge, challengeId]);

  const hasLoaded = challengesLoaded && metricsLoaded && entriesLoaded;
  const hasFiredCompletionRef = useRef(false);

  useEffect(() => {
    if (!hasLoaded || !challenge || hasFiredCompletionRef.current) return;

    if (challenge.status === "active" && isChallengePastEndDate(challenge)) {
      hasFiredCompletionRef.current = true;
      completeChallenge(challenge.id);
      addActivityEvents([createChallengeCompletedActivityEvent({ ...challenge, status: "completed", completedAt: new Date().toISOString() })]);
    }
    // Deliberately keyed on hasLoaded/challenge.status/challenge.id only -
    // this is a one-time-per-mount edge detection, not a continuous sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoaded, challenge?.status, challenge?.id]);

  return {
    hasLoaded,
    challenge,
    metrics: challengeMetrics,
    entries: challengeEntries,
    updateChallenge,
    startChallenge,
    completeChallenge,
    abandonChallenge,
    saveReview,
    deleteChallenge: async (id: string) => {
      await deleteEntriesForChallenge(id);
      deleteMetricsForChallenge(id);
      deleteChallenge(id);
    },
    addMetric,
    updateMetric,
    deleteMetric,
    moveMetric,
    setEntryValue: (metricId: string, date: string, value: number | string | undefined) => setEntryValue(challengeId, metricId, date, value),
    setEntryPhoto: (metricId: string, date: string, photoId: string | undefined) => setEntryPhoto(challengeId, metricId, date, photoId),
  } as const;
}
