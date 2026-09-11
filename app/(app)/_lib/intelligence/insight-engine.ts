import type { PersonalSignal, PersonalInsight, InsightPriority, SignalType } from "./types";

// Phase 11's Insight Engine - turns a PersonalSignal into a titled,
// evidenced PersonalInsight. Every template below states only what the
// evidence supports (fact/derived-signal language), never an unsupported
// psychological interpretation - see each signal's own `explanation`/
// `evidence`, which this module passes through untouched rather than
// re-wording into something stronger.

const TITLE_TEMPLATES: Readonly<Record<SignalType, (signal: PersonalSignal) => string>> = {
  momentum: (signal) => `${signal.label} has strong momentum`,
  friction: (signal) => `${signal.label} has become high-friction`,
  neglect: (signal) => `${signal.label} is being neglected`,
  goal_risk: (signal) => `${signal.label} is at risk of missing its deadline`,
  overload: () => "Today's important work is overloaded",
  focus_quality: (signal) =>
    signal.polarity === "positive" ? "Focus Sessions are completing cleanly" : signal.polarity === "negative" ? "Focus Sessions have been struggling" : "Focus Sessions have been mixed",
  completion_momentum: (signal) => `Continue your ${signal.label} execution context`,
  priority_conflict: () => "Calendar and Priority Gate disagree on what's next",
};

function hrefForSignal(signal: PersonalSignal): string | null {
  if (signal.entityType === "goal") return "/goals";
  if (signal.entityType === "quest") return "/quests";
  return null;
}

// goal_risk/friction/overload/priority_conflict are elevated because they
// represent something the user is likely to want to act on soon; pure
// momentum/focus_quality/completion_momentum stay informational unless the
// underlying evidence is unusually strong.
const ELEVATED_TYPES: ReadonlySet<SignalType> = new Set(["goal_risk", "friction", "overload", "priority_conflict"]);

function priorityForSignal(signal: PersonalSignal): InsightPriority {
  const weight = (signal.strength + signal.confidence) / 2;
  if (weight >= 0.7 || (ELEVATED_TYPES.has(signal.type) && weight >= 0.5)) {
    return "high";
  }
  if (weight >= 0.35) {
    return "medium";
  }
  return "low";
}

export function signalToInsight(signal: PersonalSignal): PersonalInsight {
  return {
    id: `insight:${signal.id}`,
    type: signal.type,
    title: TITLE_TEMPLATES[signal.type](signal),
    explanation: signal.explanation,
    evidence: signal.evidence,
    confidence: signal.confidence,
    priority: priorityForSignal(signal),
    relatedEntityIds: Array.from(new Set([signal.entityId, ...signal.sourceIds])),
    href: hrefForSignal(signal),
  };
}

const PRIORITY_WEIGHT: Readonly<Record<InsightPriority, number>> = { high: 2, medium: 1, low: 0 };

export function computeInsights(signals: ReadonlyArray<PersonalSignal>): PersonalInsight[] {
  return signals
    .map(signalToInsight)
    .sort((first, second) => (PRIORITY_WEIGHT[second.priority] !== PRIORITY_WEIGHT[first.priority] ? PRIORITY_WEIGHT[second.priority] - PRIORITY_WEIGHT[first.priority] : second.confidence - first.confidence));
}

// Step 12 - Notification Center integration. Deliberately narrow: only
// goal_risk and momentum insights at "high" priority are notification-worthy
// (they match the spec's own GOAL RISK / MOMENTUM examples); everything else
// stays visible in Mission Control/System Bar but never becomes a
// notification. Capped at 2 so this can never turn into notification spam.
const NOTIFIABLE_TYPES: ReadonlySet<SignalType> = new Set(["goal_risk", "momentum"]);
const MAX_NOTIFIABLE_INSIGHTS = 2;

export function getNotifiableInsights(insights: ReadonlyArray<PersonalInsight>): PersonalInsight[] {
  return insights.filter((insight) => NOTIFIABLE_TYPES.has(insight.type) && insight.priority === "high").slice(0, MAX_NOTIFIABLE_INSIGHTS);
}
