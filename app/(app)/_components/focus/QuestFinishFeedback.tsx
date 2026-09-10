"use client";

import { useState } from "react";
import type { ChecklistProgress } from "../../_lib/engines/checklist-engine";

export type QuestFeedbackDraft = Readonly<{
  energyBefore: number;
  energyAfter: number;
  focusDifficulty: number;
  taskDifficulty: number;
  note: string;
}>;

type QuestFinishFeedbackProps = Readonly<{
  questTitle: string;
  // Absent when the Quest has no checklist (mode "none") - the summary row
  // is simply omitted in that case, matching normal Quest completion.
  checklistProgress: ChecklistProgress | null;
  onSubmit: (draft: QuestFeedbackDraft) => void;
  onDiscard: () => void;
}>;

const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

function SliderRow({ label, value, onChange }: Readonly<{ label: string; value: number; onChange: (next: number) => void }>) {
  return (
    <label className="block space-y-1.5 text-left">
      <span className={labelClass}>
        {label} <span className="text-slate-300">({value}/10)</span>
      </span>
      <input type="range" min={1} max={10} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-purple-500" />
    </label>
  );
}

export default function QuestFinishFeedback({ questTitle, checklistProgress, onSubmit, onDiscard }: QuestFinishFeedbackProps) {
  const [energyBefore, setEnergyBefore] = useState(5);
  const [energyAfter, setEnergyAfter] = useState(5);
  const [focusDifficulty, setFocusDifficulty] = useState(5);
  const [taskDifficulty, setTaskDifficulty] = useState(5);
  const [note, setNote] = useState("");

  function handleSubmit() {
    onSubmit({ energyBefore, energyAfter, focusDifficulty, taskDifficulty, note: note.trim() });
  }

  return (
    <div className="w-full space-y-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
      <p className="text-center text-lg font-bold text-white">How did &ldquo;{questTitle}&rdquo; go?</p>

      {checklistProgress ? (
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          <span className={"rounded-full border px-3 py-1 font-semibold " + (checklistProgress.minimumSuccessReached ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200" : "border-slate-700 text-slate-400")}>
            Minimum Success {checklistProgress.minimumSuccessReached ? "✓" : `${checklistProgress.minimumCompleted}/${checklistProgress.minimumTotal}`}
          </span>
          <span className={"rounded-full border px-3 py-1 font-semibold " + (checklistProgress.fullCompletionReached ? "border-purple-400/50 bg-purple-400/10 text-purple-200" : "border-slate-700 text-slate-400")}>
            Full Completion {checklistProgress.fullCompletionReached ? "✓" : `${checklistProgress.fullCompleted}/${checklistProgress.fullTotal}`}
          </span>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <SliderRow label="Energy before" value={energyBefore} onChange={setEnergyBefore} />
        <SliderRow label="Energy now" value={energyAfter} onChange={setEnergyAfter} />
        <SliderRow label="Difficulty focusing" value={focusDifficulty} onChange={setFocusDifficulty} />
        <SliderRow label="Difficulty of the Quest" value={taskDifficulty} onChange={setTaskDifficulty} />
      </div>

      <label className="block space-y-1.5 text-left">
        <span className={labelClass}>What made this easier or harder? (optional)</span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          placeholder="Anything worth remembering..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400"
        />
      </label>

      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={onDiscard} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          End Without Completing
        </button>
        <button type="button" onClick={handleSubmit} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save &amp; Complete
        </button>
      </div>
    </div>
  );
}
