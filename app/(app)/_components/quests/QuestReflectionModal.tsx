"use client";

import { useState } from "react";
import Modal from "../Modal";
import type { ReflectionSubmission } from "./useQuestCompletionFlow";
import type { ReflectionFeelingAfter, ReflectionHardest, ReflectionMood } from "../../_lib/types/reflection";

type QuestReflectionModalProps = Readonly<{
  questTitle: string;
  onSkip: () => void;
  onSubmit: (input: ReflectionSubmission) => void;
}>;

const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const MOOD_OPTIONS: ReadonlyArray<{ value: ReflectionMood; emoji: string; label: string }> = [
  { value: "excellent", emoji: "😄", label: "Excellent" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "normal", emoji: "😐", label: "Normal" },
  { value: "difficult", emoji: "😕", label: "Difficult" },
  { value: "very-difficult", emoji: "😫", label: "Very difficult" },
];

const HARDEST_OPTIONS: ReadonlyArray<{ value: ReflectionHardest; label: string }> = [
  { value: "starting", label: "Starting" },
  { value: "discipline", label: "Discipline" },
  { value: "time", label: "Time" },
  { value: "energy", label: "Energy" },
  { value: "focus", label: "Focus" },
  { value: "other", label: "Other" },
];

const FEELING_OPTIONS: ReadonlyArray<{ value: ReflectionFeelingAfter; emoji: string; label: string }> = [
  { value: "energized", emoji: "⚡", label: "Energized" },
  { value: "better", emoji: "🙂", label: "Better" },
  { value: "same", emoji: "😐", label: "Same" },
  { value: "tired", emoji: "😴", label: "Tired" },
];

function toggleButtonClass(selected: boolean) {
  return (
    "rounded-xl border px-3 py-2 text-sm font-semibold transition " +
    (selected ? "border-purple-400/50 bg-purple-500/15 text-purple-100" : "border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700 hover:text-white")
  );
}

export default function QuestReflectionModal({ questTitle, onSkip, onSubmit }: QuestReflectionModalProps) {
  const [mood, setMood] = useState<ReflectionMood | null>(null);
  const [hardest, setHardest] = useState<ReflectionHardest | null>(null);
  const [hardestOtherNote, setHardestOtherNote] = useState("");
  const [feelingAfter, setFeelingAfter] = useState<ReflectionFeelingAfter | null>(null);
  const [note, setNote] = useState("");

  function handleSave() {
    if (!mood) {
      return;
    }

    onSubmit({
      mood,
      hardest: hardest ?? undefined,
      hardestOtherNote: hardest === "other" && hardestOtherNote.trim() ? hardestOtherNote.trim() : undefined,
      feelingAfter: feelingAfter ?? undefined,
      note: note.trim() ? note.trim() : undefined,
    });
  }

  return (
    <Modal title="Quick Reflection" onClose={onSkip}>
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-4 py-3">
          <p className={labelClass}>Quest</p>
          <p className="mt-1 text-lg font-bold text-white">{questTitle}</p>
        </div>

        <div className="space-y-2">
          <p className={labelClass}>How did it go?</p>
          <div className="flex flex-wrap gap-2">
            {MOOD_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setMood(option.value)} className={toggleButtonClass(mood === option.value)}>
                <span className="mr-1.5">{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className={labelClass}>What was hardest?</p>
          <div className="flex flex-wrap gap-2">
            {HARDEST_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setHardest(option.value)} className={toggleButtonClass(hardest === option.value)}>
                {option.label}
              </button>
            ))}
          </div>
          {hardest === "other" ? (
            <input
              type="text"
              value={hardestOtherNote}
              onChange={(event) => setHardestOtherNote(event.target.value)}
              placeholder="What made it hard?"
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400"
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <p className={labelClass}>How do you feel now?</p>
          <div className="flex flex-wrap gap-2">
            {FEELING_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => setFeelingAfter(option.value)} className={toggleButtonClass(feelingAfter === option.value)}>
                <span className="mr-1.5">{option.emoji}</span>
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="space-y-2 block">
          <span className={labelClass}>Note (optional)</span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            placeholder="Anything worth remembering..."
            className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400"
          />
        </label>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onSkip} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!mood}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
