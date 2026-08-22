"use client";

import { useEffect } from "react";
import { useChallenges } from "./useChallenges";
import { useWritingLogEntries } from "./useWritingLogEntries";
import { useVacancyEntries } from "./useVacancyEntries";
import { useTradeLogEntries } from "./useTradeLogEntries";
import { settleChallenge } from "../engines/challenge-engine";
import { getGoalMetric } from "../goal-metrics";
import type { GoalMetricContext } from "../goal-metrics";

// Mirrors useGoalMetricSync.ts: mounted once globally (see
// ChallengeSettlementEffect), it settles every active Challenge's past days
// against real activity data whenever that data changes. Only ever appends
// to history and advances state forward - never rewrites a day once it's
// been settled.
export function useChallengeSettlement() {
  const { challenges, setChallenges, hasLoaded: challengesLoaded } = useChallenges();
  const { entries: writingLogEntries, hasLoaded: writingLogLoaded } = useWritingLogEntries();
  const { entries: vacancyEntries, hasLoaded: vacanciesLoaded } = useVacancyEntries();
  const { entries: tradeLogEntries, hasLoaded: tradeLogLoaded } = useTradeLogEntries();

  useEffect(() => {
    if (!challengesLoaded || !writingLogLoaded || !vacanciesLoaded || !tradeLogLoaded) {
      return;
    }

    const context: GoalMetricContext = { writingLogEntries, vacancyEntries, tradeLogEntries };

    setChallenges((current) => {
      let changed = false;

      const next = current.map((challenge) => {
        const metric = getGoalMetric(challenge.metricSource);

        if (!metric?.computeForDay) {
          return challenge;
        }

        const settled = settleChallenge(challenge, (dayKey) => metric.computeForDay!(context, dayKey));

        if (settled !== challenge) {
          changed = true;
        }

        return settled;
      });

      return changed ? next : current;
    });
  }, [challengesLoaded, writingLogLoaded, vacanciesLoaded, tradeLogLoaded, writingLogEntries, vacancyEntries, tradeLogEntries, setChallenges]);
}
