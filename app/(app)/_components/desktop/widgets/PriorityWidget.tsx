"use client";

import FloatingWidgetShell from "./FloatingWidgetShell";
import { useAtlasContext } from "../../../_lib/atlas-context";
import type { EisenhowerQuadrant } from "../../../_lib/types/quest";

// Small, file-private label/icon lookup - deliberately mirrors
// TodaysPriorityGate.tsx's own (also module-private) table rather than
// importing it, the same "not worth widening an export for a 4-entry
// table" call that file already made.
const QUADRANT_ICONS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "🔴",
  urgent_not_important: "🟠",
  not_urgent_important: "🟡",
  not_urgent_not_important: "⚪",
};

const QUADRANT_LABELS: Record<EisenhowerQuadrant, string> = {
  urgent_important: "Urgent & Important",
  urgent_not_important: "Urgent, Not Important",
  not_urgent_important: "Important, Not Urgent",
  not_urgent_not_important: "Neither",
};

// Reuses useAtlasContext()'s currentPriorityQuadrant - the exact same
// Priority Gate derivation (Phase 11's engine) TodaysPriorityGate.tsx
// already reads, never a second computation.
export default function PriorityWidget() {
  const { currentPriorityQuadrant } = useAtlasContext();

  return (
    <FloatingWidgetShell widgetId="priority" label="Priority">
      {!currentPriorityQuadrant ? (
        <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">No current priority.</div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <span style={{ fontSize: "2rem" }} aria-hidden="true">
            {QUADRANT_ICONS[currentPriorityQuadrant]}
          </span>
          <p className="text-xs font-semibold text-white">{QUADRANT_LABELS[currentPriorityQuadrant]}</p>
        </div>
      )}
    </FloatingWidgetShell>
  );
}
