"use client";

import { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import RelatedEntitiesPanel from "../relationships/RelatedEntitiesPanel";
import AskJarvisLink from "../jarvis/AskJarvisLink";
import type { AchievementMoment, AchievementMomentType } from "../../_lib/achievements/types";

// Phase 12's JARVIS-style Achievement Moment presentation. Deliberately
// restrained: title + one-line "why this matters" explanation + optional
// XP, with evidence and related entities behind a "View Evidence" toggle -
// the default view stays concise (Step 9), and nothing here is a hardcoded
// congratulation string; every word comes from the moment's own structured
// fields (title/explanation/evidence), which the pattern engine derived
// from real data.
const EYEBROW_BY_TYPE: Readonly<Record<AchievementMomentType, string>> = {
  first: "FIRST STEP",
  consistency: "CONSISTENCY",
  comeback: "COMEBACK",
  breakthrough: "BREAKTHROUGH",
  momentum: "MOMENTUM",
  milestone: "MISSION ACCOMPLISHED",
};

// Matches achievement-moment-engine.ts's NOTIFIABLE_SIGNIFICANCE_THRESHOLD -
// the same "top tier" cutoff gets the same gold visual treatment wherever
// this card is rendered.
const HIGH_SIGNIFICANCE = 55;

type AchievementMomentCardProps = Readonly<{
  moment: AchievementMoment;
  defaultExpanded?: boolean;
}>;

export default function AchievementMomentCard({ moment, defaultExpanded = false }: AchievementMomentCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const isHighSignificance = moment.significance >= HIGH_SIGNIFICANCE;

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br from-slate-950/90 via-slate-950/75 to-cyan-950/20 p-4 ${isHighSignificance ? "border-amber-400/25 shadow-[0_0_40px_rgba(251,191,36,0.08)]" : "border-cyan-400/20 shadow-[0_0_30px_rgba(34,211,238,0.06)]"}`}
    >
      <div className="flex items-center gap-2">
        <Sparkles className={`h-3.5 w-3.5 ${isHighSignificance ? "text-amber-300" : "text-cyan-300"}`} aria-hidden="true" />
        <p className={`text-[10px] font-semibold uppercase tracking-[0.22em] ${isHighSignificance ? "text-amber-300" : "text-cyan-300"}`}>{EYEBROW_BY_TYPE[moment.type]}</p>
      </div>

      <p className="mt-2 text-base font-black text-white">{moment.title}</p>
      <p className="mt-1.5 text-sm leading-6 text-slate-300">{moment.explanation}</p>

      {moment.xpAwarded ? <p className="mt-3 text-sm font-semibold text-purple-200">+{moment.xpAwarded} XP</p> : null}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => setExpanded((current) => !current)} className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300/80 transition hover:text-cyan-200">
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
          {expanded ? "Hide Evidence" : "View Evidence"}
        </button>
        <AskJarvisLink
          label="Why is this significant?"
          question={`Why is "${moment.title}" significant?`}
          className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300/80 transition hover:text-cyan-200"
        />
      </div>

      {expanded ? (
        <div className="mt-3 space-y-3 border-t border-slate-800/80 pt-3">
          <ul className="space-y-1.5">
            {moment.evidence.map((item) => (
              <li key={`${item.type}:${item.sourceId}`} className="flex items-start gap-2 text-xs text-slate-400">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-cyan-400/60" aria-hidden="true" />
                <span>
                  {item.label}
                  {item.value ? ` (${item.value})` : ""}
                </span>
              </li>
            ))}
          </ul>
          <RelatedEntitiesPanel title="Related" groups={moment.relatedGroups} />
        </div>
      ) : null}
    </div>
  );
}
