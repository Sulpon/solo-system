"use client";

import FloatingWidgetShell from "./FloatingWidgetShell";
import { useAtlasContext } from "../../../_lib/atlas-context";

// Reuses useAtlasContext()'s currentLevel/dailyXp/totalXp - already a live
// read of the real Progression store (Phase 1), never a duplicate XP
// ledger.
export default function XPWidget() {
  const { currentLevel, dailyXp, totalXp } = useAtlasContext();

  return (
    <FloatingWidgetShell widgetId="xp" label="XP">
      <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200">LV {currentLevel}</span>
        <span className="font-black tabular-nums text-white" style={{ fontSize: "1.75rem" }}>
          +{dailyXp} XP
        </span>
        <span className="text-[10px] text-slate-500">{totalXp.toLocaleString()} total</span>
      </div>
    </FloatingWidgetShell>
  );
}
