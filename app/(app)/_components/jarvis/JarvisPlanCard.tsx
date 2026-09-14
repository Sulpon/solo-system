"use client";

import { Check, Clock, Lock, Loader2, X } from "lucide-react";
import type { JarvisPlan, JarvisPlanStep } from "../../_lib/jarvis/types";

// Phase 18 - the persistent plan's ONE view. Unlike Phase 16's card (which
// collapsed to a generic "confirmed"/"cancelled" line via local component
// state), this renders directly off the REAL, persisted plan/step statuses
// - Atlas owns this state, so the same card looks correct whether it just
// appeared, was left mid-execution across a refresh, or is being resumed
// after a Pause. No local resolved/pending state at all.
type JarvisPlanCardProps = Readonly<{
  plan: JarvisPlan;
  onConfirm: (planId: string) => void;
  onExecuteReady: (planId: string) => void;
  onPause: (planId: string) => void;
  onContinue: (planId: string) => void;
  onCancel: (planId: string) => void;
}>;

function dependencyLabel(step: JarvisPlanStep, allSteps: ReadonlyArray<JarvisPlanStep>): string | null {
  if (step.dependencies.length === 0) return null;
  const labels = step.dependencies.map((depId, index) => allSteps.find((candidate) => candidate.id === depId)?.proposal.summary ?? `step ${index + 1}`);
  return labels.join(", ");
}

function StepRow({ step, index, allSteps }: Readonly<{ step: JarvisPlanStep; index: number; allSteps: ReadonlyArray<JarvisPlanStep> }>) {
  const depLabel = dependencyLabel(step, allSteps);

  const statusIcon =
    step.status === "completed" ? (
      <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
    ) : step.status === "failed" ? (
      <X className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
    ) : step.status === "skipped" ? (
      <X className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
    ) : step.status === "executing" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" aria-hidden="true" />
    ) : step.status === "ready" ? (
      <Clock className="h-3.5 w-3.5 text-cyan-300" aria-hidden="true" />
    ) : (
      <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
    );

  const statusLabel =
    step.status === "completed"
      ? "Completed"
      : step.status === "failed"
        ? "Failed"
        : step.status === "skipped"
          ? "Skipped"
          : step.status === "executing"
            ? "Executing"
            : step.status === "ready"
              ? "Ready"
              : depLabel
                ? `Blocked by ${depLabel}`
                : "Blocked";

  const statusColor = step.status === "completed" ? "text-emerald-400" : step.status === "failed" ? "text-rose-400" : step.status === "ready" ? "text-cyan-300" : "text-slate-500";

  return (
    <li className="text-xs">
      <div className="flex items-center gap-2">
        {statusIcon}
        <p className="font-semibold text-white">
          {index + 1}. {step.proposal.summary}
        </p>
      </div>
      <p className={`mt-0.5 pl-5 text-[11px] font-medium ${statusColor}`}>{statusLabel}</p>
      {step.status === "failed" && step.failureReason ? <p className="mt-0.5 pl-5 text-[11px] text-rose-300/80">{step.failureReason}</p> : null}
      {step.proposal.preview.length > 0 && step.status !== "completed" && step.status !== "failed" && step.status !== "skipped" ? (
        <div className="mt-1 space-y-0.5 pl-5">
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
  );
}

export default function JarvisPlanCard({ plan, onConfirm, onExecuteReady, onPause, onContinue, onCancel }: JarvisPlanCardProps) {
  const hasReadyStep = plan.steps.some((step) => step.status === "ready");
  const isTerminal = plan.status === "completed" || plan.status === "failed" || plan.status === "cancelled";

  const statusBadge =
    plan.status === "proposed"
      ? "Awaiting confirmation"
      : plan.status === "active"
        ? "In progress"
        : plan.status === "paused"
          ? "Paused"
          : plan.status === "completed"
            ? "Completed"
            : plan.status === "failed"
              ? "Failed"
              : "Cancelled";

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">{plan.title}</p>
        <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-400">{statusBadge}</span>
      </div>
      {plan.objective ? <p className="mt-1 text-xs text-slate-300">{plan.objective}</p> : null}

      <ol className="mt-2.5 space-y-2.5 border-t border-amber-400/15 pt-2.5">
        {plan.steps.map((step, index) => (
          <StepRow key={step.id} step={step} index={index} allSteps={plan.steps} />
        ))}
      </ol>

      {!isTerminal ? (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-amber-400/15 pt-3">
          {plan.status === "proposed" ? (
            <button
              type="button"
              onClick={() => onConfirm(plan.id)}
              className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
            >
              Confirm Plan ({plan.steps.length} steps)
            </button>
          ) : null}
          {plan.status === "active" && hasReadyStep ? (
            <button type="button" onClick={() => onExecuteReady(plan.id)} className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25">
              Execute Ready Step{plan.steps.filter((s) => s.status === "ready").length > 1 ? "s" : ""}
            </button>
          ) : null}
          {plan.status === "active" ? (
            <button type="button" onClick={() => onPause(plan.id)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white">
              Pause
            </button>
          ) : null}
          {plan.status === "paused" ? (
            <button type="button" onClick={() => onContinue(plan.id)} className="rounded-lg border border-cyan-400/50 bg-cyan-500/15 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-500/25">
              Continue
            </button>
          ) : null}
          <button type="button" onClick={() => onCancel(plan.id)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-rose-500/50 hover:text-rose-200">
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
