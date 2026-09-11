"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import { usePersonalIntelligence } from "../../_lib/hooks/usePersonalIntelligence";
import type { PersonalSignal, SignalType } from "../../_lib/intelligence/types";

// Phase 11's Mission Control surface (Step 10): a compact "what's my state /
// what should I do" section, built entirely from usePersonalIntelligence()
// (the real Signal -> State -> Insight -> Recommendation -> Next Action
// pipeline - see _lib/intelligence/). Deliberately renders NOTHING while a
// mission is active (MissionControlPanel already owns that dominant state,
// per Step 10: "Do not let intelligence recommendations interfere with
// active execution") and NOTHING when there is genuinely no signal/
// recommendation to show - an empty state here is a valid, honest result,
// not a bug to paper over with placeholder content.

const STATE_BADGES: Readonly<Record<SignalType, Readonly<{ label: string; className: string }>>> = {
  momentum: { label: "Strong momentum", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  friction: { label: "High friction", className: "border-rose-400/30 bg-rose-400/10 text-rose-200" },
  neglect: { label: "Neglected", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  goal_risk: { label: "At risk", className: "border-rose-400/30 bg-rose-400/10 text-rose-200" },
  overload: { label: "Overloaded", className: "border-amber-400/30 bg-amber-400/10 text-amber-200" },
  focus_quality: { label: "Focus quality", className: "border-cyan-400/30 bg-cyan-400/10 text-cyan-200" },
  completion_momentum: { label: "Building momentum", className: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" },
  priority_conflict: { label: "Conflict", className: "border-rose-400/30 bg-rose-400/10 text-rose-200" },
};

// One row per real Goal, not per signal - a goal with both a risk and a
// friction signal only needs its single most significant state shown here
// (its own Connected/detail page carries the full picture).
function pickTopStateRows(signals: ReadonlyArray<PersonalSignal>): PersonalSignal[] {
  const byEntity = new Map<string, PersonalSignal>();
  for (const signal of signals) {
    if (signal.type !== "momentum" && signal.type !== "friction" && signal.type !== "neglect" && signal.type !== "goal_risk") continue;
    const existing = byEntity.get(signal.entityId);
    const score = signal.strength * signal.confidence;
    if (!existing || score > existing.strength * existing.confidence) {
      byEntity.set(signal.entityId, signal);
    }
  }
  return Array.from(byEntity.values())
    .sort((first, second) => second.strength * second.confidence - first.strength * first.confidence)
    .slice(0, 4);
}

export default function AtlasIntelligencePanel() {
  const { state, signals, nextAction } = usePersonalIntelligence();

  if (state.activeMission) {
    return null;
  }

  const stateRows = pickTopStateRows(signals);
  if (stateRows.length === 0 && !nextAction) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-cyan-300" aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Atlas Intelligence</p>
      </div>

      {stateRows.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Current State</p>
          {stateRows.map((signal) => (
            <div key={signal.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-slate-300">{signal.label}</span>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATE_BADGES[signal.type].className}`}>{STATE_BADGES[signal.type].label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {nextAction ? (
        <div className={stateRows.length > 0 ? "mt-4 border-t border-slate-800/80 pt-3" : "mt-3"}>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Recommendation</p>
          <p className="mt-1 text-sm font-semibold text-white">{nextAction.title}</p>
          <p className="mt-1 text-xs text-slate-400">{nextAction.reason}</p>
          {nextAction.href ? (
            <Link href={nextAction.href} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25">
              Open
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
