import type { ChecklistItem } from "./quest";

// A reusable named checklist a Fixed-mode Quest can be seeded from.
// Applying a template to a Quest COPIES its items (fresh ids, all
// unchecked) into that Quest's own `checklist` - the Quest is then free to
// add/edit/remove items without ever mutating this template, mirroring
// every other template/instance relationship in this app (see
// WorkoutTemplate -> WorkoutSession in types/workout.ts).
export type ChecklistTemplate = Readonly<{
  id: string;
  title: string;
  items: ReadonlyArray<ChecklistItem>;
  createdAt: string;
  updatedAt: string;
}>;
