import type { EisenhowerQuadrant } from "./quest";

// A locked plan snapshots which quadrant each planned Task belonged to AT
// LOCK TIME - not a live reference to Quest.eisenhowerQuadrant. This is the
// one piece of state that must survive a later, unrelated reclassification
// of that Quest elsewhere in the app ("changing priority after lock should
// be treated deliberately" - see priority-gate-engine.ts). Quest remains
// the sole source of truth for everything else (title, checklist,
// completion, scheduling) - this is a reference + a snapshot of one field,
// never a copy of the Quest itself.
export type DailyPlanTaskAssignment = Readonly<{
  questId: string;
  quadrant: EisenhowerQuadrant;
}>;

// Recorded when the user deliberately reveals/works a quadrant other than
// the currently-unlocked one (see TodaysPriorityGate.tsx) - a lightweight,
// disclosed bypass log, not an enforcement mechanism. Deliberately kept on
// DailyPlan rather than the separate ActivityEvent feed (a closed union of
// XP/progression events this isn't a member of) - the smallest persistence
// change that still "records the override event."
export type DailyPlanOverrideEvent = Readonly<{
  quadrant: EisenhowerQuadrant;
  at: string;
}>;

// One day's Eisenhower plan. Keyed by local day key (see local-day.ts) in
// the collection this is stored under (Record<string, DailyPlan>) - `date`
// is repeated here purely so a single DailyPlan stays self-describing if
// ever read outside that map.
//
// While `locked` is false, there is nothing authoritative to read here yet
// - the Priority Gate and the evening planning view both fall back to
// deriving assignments live from every active Task's current
// eisenhowerQuadrant (see resolvePlanAssignments in priority-gate-engine.ts).
// `assignments` only becomes the source of truth once locked, and is
// simply ignored (left as whatever stale value it had) while unlocked -
// LOCK TOMORROW always captures a fresh snapshot.
export type DailyPlan = Readonly<{
  date: string;
  locked: boolean;
  assignments: ReadonlyArray<DailyPlanTaskAssignment>;
  overrides: ReadonlyArray<DailyPlanOverrideEvent>;
  createdAt: string;
  updatedAt: string;
}>;
