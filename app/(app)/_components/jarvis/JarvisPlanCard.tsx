"use client";

import { useState } from "react";
import type { JarvisPlan } from "../../_lib/jarvis/types";

// Phase 16 - the multi-step counterpart to JarvisActionConfirmCard.tsx.
// ONE confirmation gates the WHOLE plan (Step "PLAN PREVIEW" -> single
// "USER CONFIRMATION" arrow before sequential execution begins) - there is
// no per-step confirm button. The actual step-by-step VERIFIED outcome
// (including any step skipped because an earlier one failed or went
// stale) is reported as a follow-up system message by
// useJarvisConversation's confirmPlan, exactly mirroring how a single
// action's result already works - this card only needs to show its own
// resolved state afterward.
type JarvisPlanCardProps = Readonly<{
  plan: JarvisPlan;
  onConfirm: (plan: JarvisPlan) => void;
  onCancel: () => void;
}>;

export default function JarvisPlanCard({ plan, onConfirm, onCancel }: JarvisPlanCardProps) {
  const [resolved, setResolved] = useState<"pending" | "confirmed" | "cancelled">("pending");

  if (resolved !== "pending") {
    return <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-500">{resolved === "confirmed" ? "Plan confirmed - see the result below." : "Plan cancelled."}</p>;
  }

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">{plan.title}</p>

      <ol className="mt-2.5 space-y-2.5 border-t border-amber-400/15 pt-2.5">
        {plan.steps.map((step, index) => (
          <li key={step.id} className="text-xs">
            <p className="font-semibold text-white">
              {index + 1}. {step.proposal.summary}
            </p>
            {step.proposal.preview.length > 0 ? (
              <div className="mt-1 space-y-0.5 pl-4">
                {step.proposal.preview.map((field) => (
                  <div key={field.label} className="flex items-center justify-between gap-3 text-[11px]">
                    <span className="text-slate-500">{field.label}</span>
                    <span className="flex items-center gap-1.5 text-right">
                      {field.before ? <span className="text-slate-500 line-through decoration-slate-700">{field.before}</span> : null}
                      <span className="font-semibold text-slate-200">{field.after}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="mt-3 flex gap-2 border-t border-amber-400/15 pt-3">
        <button
          type="button"
          onClick={() => {
            setResolved("confirmed");
            onConfirm(plan);
          }}
          className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
        >
          Confirm Plan ({plan.steps.length} steps)
        </button>
        <button
          type="button"
          onClick={() => {
            setResolved("cancelled");
            onCancel();
          }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
