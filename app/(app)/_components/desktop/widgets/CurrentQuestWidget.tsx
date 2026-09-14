"use client";

import FloatingWidgetShell from "./FloatingWidgetShell";
import { useAtlasContext } from "../../../_lib/atlas-context";
import { formatFocusDuration } from "../../focus/focus-format";
import { selectWidgetChecklistItems } from "./current-quest-widget.utils";
import type { ChecklistItem } from "../../../_lib/types/quest";

// Read-only compact checklist row - no onToggle. V1 keeps this widget
// display-only (see current-quest-widget.utils.ts's own note): the real
// interactive checklist row already exists (CompactChecklistItem in
// CompactFocusWidgets.tsx, used by the Focus Companion), but wiring this
// widget to mutate the Quest would mean pulling in
// useQuestExecutionSession() here too - out of scope for what was asked
// ("accurate live display" is the requirement, not a new interaction
// surface), and this widget currently has no reason to touch Focus/
// Companion architecture at all.
function ChecklistItemLine({ item }: Readonly<{ item: ChecklistItem }>) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span aria-hidden="true" className={"shrink-0 " + (item.completed ? "text-emerald-300" : "text-slate-600")}>
        {item.completed ? "☑" : "☐"}
      </span>
      <span className={"truncate " + (item.completed ? "text-slate-500 line-through" : "text-slate-300")}>{item.title}</span>
    </div>
  );
}

// Reuses useAtlasContext() (already the single, lightweight, always-
// mounted read of "what is Atlas doing right now" - Phase 3) rather than
// deriving its own copy of active-Quest/Focus state. No new engine, no new
// storage - a presentation-only window over state that already exists.
// checklistProgress and activeQuest.checklist both come straight from the
// real Quest (via useQuestExecutionSession -> questDefinitions), so any
// checklist edit made elsewhere (the Quest detail tab, FocusOverlay, the
// Focus Companion) appears here automatically on the next render - there is
// no separate widget-local checklist state to keep in sync.
export default function CurrentQuestWidget() {
  const { activeQuest, isQuestExecution, isFocusRunning, elapsedSeconds, checklistProgress } = useAtlasContext();
  const checklist = activeQuest?.checklist ?? [];
  const { visibleItems, hiddenCount } = selectWidgetChecklistItems(checklist);

  return (
    <FloatingWidgetShell widgetId="current-quest" label="Current Quest">
      {!activeQuest || !isQuestExecution ? (
        <div className="flex h-full items-center justify-center text-center text-xs text-slate-500">No active Quest right now.</div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-bold text-white">{activeQuest.title}</p>
          <div className="flex items-center justify-between">
            <span className="font-black tabular-nums text-white" style={{ fontSize: "1.5rem" }}>
              {formatFocusDuration(elapsedSeconds)}
            </span>
            <span className={"rounded-full border px-2 py-0.5 text-[10px] font-semibold " + (isFocusRunning ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-slate-700 text-slate-400")}>
              {isFocusRunning ? "Running" : "Paused"}
            </span>
          </div>

          {checklistProgress && checklist.length > 0 ? (
            <div className="space-y-1.5 border-t border-slate-800 pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                {checklistProgress.fullCompleted} / {checklistProgress.fullTotal} completed
              </p>
              <div className="space-y-1">
                {visibleItems.map((item) => (
                  <ChecklistItemLine key={item.id} item={item} />
                ))}
              </div>
              {hiddenCount > 0 ? <p className="text-[10px] text-slate-600">+{hiddenCount} more</p> : null}
            </div>
          ) : null}

          {checklistProgress ? (
            <p className="text-[10px] text-slate-500">
              Minimum Success: {checklistProgress.minimumCompleted}/{checklistProgress.minimumTotal}
              {checklistProgress.minimumSuccessReached ? " ✓" : ""}
            </p>
          ) : null}
        </div>
      )}
    </FloatingWidgetShell>
  );
}
