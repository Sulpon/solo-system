import type { EisenhowerQuadrant } from "./quest";

// Persisted, user-customizable display names for the four Eisenhower
// quadrants (see EisenhowerQuadrant in types/quest.ts). Renaming a quadrant
// here only ever changes what's shown on screen - Quest.eisenhowerQuadrant
// always stores the stable id, never this label, so existing Tasks are
// completely unaffected by a rename.
export type EisenhowerQuadrantNames = Record<EisenhowerQuadrant, string>;

export const DEFAULT_EISENHOWER_QUADRANT_NAMES: EisenhowerQuadrantNames = {
  urgent_important: "Urgent + Important",
  urgent_not_important: "Urgent + Not Important",
  not_urgent_important: "Not Urgent + Important",
  not_urgent_not_important: "Not Urgent + Not Important",
};
