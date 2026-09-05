"use client";

import { useState } from "react";
import Modal from "../Modal";

type ChallengeNoteModalProps = Readonly<{
  metricName: string;
  date: string;
  initialValue: string;
  onSave: (value: string) => void;
  onClose: () => void;
}>;

export default function ChallengeNoteModal({ metricName, date, initialValue, onSave, onClose }: ChallengeNoteModalProps) {
  const [text, setText] = useState(initialValue);

  return (
    <Modal title={metricName} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{date}</p>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={5}
          autoFocus
          placeholder="Notes for this day..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm text-white outline-none transition focus:border-purple-400"
        />
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(text.trim())}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
