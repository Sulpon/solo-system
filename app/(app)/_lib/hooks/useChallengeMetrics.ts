"use client";

import { useCallback } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { ChallengeMetric, ChallengeMetricType } from "../types/challenge";

function generateMetricId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "metric-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

export type ChallengeMetricDraft = Readonly<{
  challengeId: string;
  name: string;
  type: ChallengeMetricType;
  target?: number;
  unit?: string;
  required?: boolean;
}>;

function renumber(metrics: ReadonlyArray<ChallengeMetric>): ChallengeMetric[] {
  return metrics.map((metric, index) => (metric.position === index ? metric : { ...metric, position: index }));
}

export function useChallengeMetrics() {
  const [metrics, setMetrics, hasLoaded] = useLocalStorageState<ChallengeMetric[]>(STORAGE_KEYS.challengeMetrics, []);

  const getMetricsForChallenge = useCallback((challengeId: string) => metrics.filter((metric) => metric.challengeId === challengeId).sort((a, b) => a.position - b.position), [metrics]);

  const addMetric = useCallback(
    (draft: ChallengeMetricDraft) => {
      const siblingCount = metrics.filter((metric) => metric.challengeId === draft.challengeId).length;
      const metric: ChallengeMetric = {
        id: generateMetricId(),
        challengeId: draft.challengeId,
        name: draft.name,
        type: draft.type,
        target: draft.target,
        unit: draft.unit,
        required: draft.required ?? true,
        position: siblingCount,
      };

      setMetrics((current) => [...current, metric]);
      return metric;
    },
    [metrics, setMetrics],
  );

  const updateMetric = useCallback(
    (id: string, patch: Partial<Pick<ChallengeMetric, "name" | "type" | "target" | "unit" | "required">>) => {
      setMetrics((current) => current.map((metric) => (metric.id === id ? { ...metric, ...patch } : metric)));
    },
    [setMetrics],
  );

  const deleteMetric = useCallback(
    (id: string) => {
      setMetrics((current) => {
        const target = current.find((metric) => metric.id === id);
        if (!target) return current;
        const remaining = current.filter((metric) => metric.id !== id);
        const siblings = renumber(remaining.filter((metric) => metric.challengeId === target.challengeId));
        const others = remaining.filter((metric) => metric.challengeId !== target.challengeId);
        return [...others, ...siblings];
      });
    },
    [setMetrics],
  );

  const moveMetric = useCallback(
    (id: string, direction: -1 | 1) => {
      setMetrics((current) => {
        const target = current.find((metric) => metric.id === id);
        if (!target) return current;

        const siblings = current.filter((metric) => metric.challengeId === target.challengeId).sort((a, b) => a.position - b.position);
        const index = siblings.findIndex((metric) => metric.id === id);
        const swapIndex = index + direction;
        if (swapIndex < 0 || swapIndex >= siblings.length) return current;

        const reordered = [...siblings];
        [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
        const renumbered = renumber(reordered);
        const others = current.filter((metric) => metric.challengeId !== target.challengeId);
        return [...others, ...renumbered];
      });
    },
    [setMetrics],
  );

  const deleteMetricsForChallenge = useCallback(
    (challengeId: string) => {
      setMetrics((current) => current.filter((metric) => metric.challengeId !== challengeId));
    },
    [setMetrics],
  );

  return { metrics, getMetricsForChallenge, addMetric, updateMetric, deleteMetric, moveMetric, deleteMetricsForChallenge, hasLoaded } as const;
}
