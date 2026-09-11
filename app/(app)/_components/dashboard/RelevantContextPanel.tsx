"use client";

import { BrainCircuit } from "lucide-react";
import { useAtlasIntelligenceContext } from "../../_lib/hooks/useAtlasIntelligenceContext";
import type { PersonalMemory } from "../../_lib/memory/types";

// Phase 13 Step 31 - the one subtle, user-facing surface for Personal
// Memory this phase builds: NOT a Memory management app, just a small
// "here's what Atlas currently understands" strip in Mission Control.
// Deliberately hidden while a mission is active (same rule
// AtlasIntelligencePanel/RecentAchievementsPanel already follow - context
// is informational, not a reason to clutter active execution), and
// deliberately capped to a handful of items - "do not overwhelm the user."
const MAX_SHOWN = 3;

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.7) return "High";
  if (confidence >= 0.4) return "Medium";
  return "Low";
}

function MemoryLine({ memory }: { memory: PersonalMemory }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-900 py-2.5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-slate-200">{memory.content}</p>
        {memory.evidence[0] ? <p className="mt-0.5 truncate text-xs text-slate-500">Based on {memory.evidence[0].label.toLowerCase()}</p> : null}
      </div>
      {memory.origin === "derived" ? (
        <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] font-semibold text-slate-500">{confidenceLabel(memory.confidence)}</span>
      ) : null}
    </div>
  );
}

export default function RelevantContextPanel() {
  const context = useAtlasIntelligenceContext();

  if (context.activeMission) {
    return null;
  }

  const shown = context.relevantMemories.slice(0, MAX_SHOWN).map((entry) => entry.memory);
  if (shown.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center gap-2">
        <BrainCircuit className="h-4 w-4 text-purple-300" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Relevant Context</p>
      </div>
      <div className="mt-2">
        {shown.map((memory) => (
          <MemoryLine key={memory.id} memory={memory} />
        ))}
      </div>
    </div>
  );
}
