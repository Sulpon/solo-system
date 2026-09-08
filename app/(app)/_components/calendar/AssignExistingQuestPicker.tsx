"use client";

import { useState } from "react";
import type { Quest } from "../../_lib/types/quest";

type AssignExistingQuestPickerProps = Readonly<{
  availableQuests: ReadonlyArray<Quest>;
  onAssign: (questId: string) => void;
}>;

export default function AssignExistingQuestPicker({ availableQuests, onAssign }: AssignExistingQuestPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [selectedId, setSelectedId] = useState("");

  if (availableQuests.length === 0) {
    return null;
  }

  if (!showPicker) {
    return (
      <button type="button" onClick={() => setShowPicker(true)} className="w-full rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
        + Assign Existing Quest
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedId}
        onChange={(event) => setSelectedId(event.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950/70 px-2 py-2 text-xs text-white outline-none transition focus:border-purple-400"
      >
        <option value="" disabled>
          Choose a quest...
        </option>
        {availableQuests.map((quest) => (
          <option key={quest.id} value={quest.id}>
            {quest.title}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => {
          if (!selectedId) return;
          onAssign(selectedId);
          setSelectedId("");
          setShowPicker(false);
        }}
        disabled={!selectedId}
        className="shrink-0 rounded-lg border border-purple-400/50 bg-purple-500/15 px-2.5 py-2 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Add
      </button>
      <button type="button" onClick={() => setShowPicker(false)} className="shrink-0 text-xs text-slate-500 transition hover:text-white">
        ✕
      </button>
    </div>
  );
}
