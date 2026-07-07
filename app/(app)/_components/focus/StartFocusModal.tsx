"use client";

import { useState } from "react";
import Modal from "../Modal";
import { FOCUS_MODE_LABELS, FOCUS_MODE_MINUTES } from "../../_lib/types/focus";
import type { FocusMode } from "../../_lib/types/focus";

type StartFocusModalProps = Readonly<{
  questTitle?: string;
  onStart: (mode: FocusMode, durationMinutes: number) => void;
  onClose: () => void;
}>;

const presetModes: ReadonlyArray<Exclude<FocusMode, "custom">> = ["pomodoro", "deep-work", "90-min"];
const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

export default function StartFocusModal({ questTitle, onStart, onClose }: StartFocusModalProps) {
  const [customMinutes, setCustomMinutes] = useState("45");

  return (
    <Modal title="Start Focus" onClose={onClose}>
      <div className="space-y-5">
        {questTitle ? <p className="text-sm text-slate-400">Focusing on: <span className="font-semibold text-white">{questTitle}</span></p> : null}

        <div className="grid gap-3 sm:grid-cols-3">
          {presetModes.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onStart(mode, FOCUS_MODE_MINUTES[mode])}
              className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-left transition hover:border-purple-400/50 hover:bg-purple-500/10"
            >
              <p className="text-sm font-bold text-white">{FOCUS_MODE_LABELS[mode]}</p>
              <p className="mt-1 text-xs text-slate-500">{FOCUS_MODE_MINUTES[mode]} min</p>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Custom</p>
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              min={1}
              value={customMinutes}
              onChange={(event) => setCustomMinutes(event.target.value)}
              className={inputClass}
            />
            <span className="shrink-0 text-sm text-slate-400">minutes</span>
            <button
              type="button"
              onClick={() => {
                const minutes = Number(customMinutes);

                if (Number.isFinite(minutes) && minutes > 0) {
                  onStart("custom", minutes);
                }
              }}
              className="shrink-0 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
            >
              Start
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
