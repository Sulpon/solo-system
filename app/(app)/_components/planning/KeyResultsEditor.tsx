"use client";

import { useState } from "react";
import type { KeyResult } from "../../_lib/types/goal-tree";

const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-purple-400";

function generateKeyResultId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "kr-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
}

type KeyResultsEditorProps = Readonly<{
  keyResults: ReadonlyArray<KeyResult>;
  onChange: (next: ReadonlyArray<KeyResult>) => void;
  readOnlyProgress?: boolean;
}>;

export default function KeyResultsEditor({ keyResults, onChange, readOnlyProgress = false }: KeyResultsEditorProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("10");
  const [unit, setUnit] = useState("");

  function addKeyResult() {
    if (!title.trim()) return;
    const target = Math.max(1, Number(targetValue) || 1);
    onChange([...keyResults, { id: generateKeyResultId(), title: title.trim(), targetValue: target, currentValue: 0, unit: unit.trim() || undefined }]);
    setTitle("");
    setTargetValue("10");
    setUnit("");
    setShowAdd(false);
  }

  function updateCurrentValue(id: string, value: number) {
    onChange(keyResults.map((kr) => (kr.id === id ? { ...kr, currentValue: Math.max(0, value) } : kr)));
  }

  function removeKeyResult(id: string) {
    onChange(keyResults.filter((kr) => kr.id !== id));
  }

  return (
    <div className="space-y-2.5">
      {keyResults.map((kr) => {
        const percent = Math.min(100, Math.round((kr.currentValue / Math.max(1, kr.targetValue)) * 100));
        return (
          <div key={kr.id} className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-semibold text-white">{kr.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                {readOnlyProgress ? (
                  <span className="text-xs text-slate-400">
                    {kr.currentValue} / {kr.targetValue} {kr.unit ?? ""}
                  </span>
                ) : (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={kr.currentValue}
                      onChange={(event) => updateCurrentValue(kr.id, Number(event.target.value) || 0)}
                      className="w-16 rounded-md border border-slate-700 bg-slate-950/70 px-1.5 py-1 text-right text-xs text-white outline-none focus:border-purple-400"
                    />
                    <span className="text-xs text-slate-500">
                      / {kr.targetValue} {kr.unit ?? ""}
                    </span>
                    <button type="button" onClick={() => removeKeyResult(kr.id)} className="text-xs text-rose-400/80 transition hover:text-rose-300">
                      Remove
                    </button>
                  </>
                )}
                <span className="text-xs font-semibold text-cyan-300">{percent}%</span>
              </div>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-purple-400" style={{ width: `${percent}%` }} />
            </div>
          </div>
        );
      })}

      {!readOnlyProgress ? (
        showAdd ? (
          <div className="rounded-lg border border-purple-500/25 bg-slate-950/60 p-3">
            <div className="grid gap-2 sm:grid-cols-[1fr_5.5rem_5.5rem]">
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="30 quality applications" className={inputClass} />
              <input type="number" min={1} value={targetValue} onChange={(event) => setTargetValue(event.target.value)} placeholder="Target" className={inputClass} />
              <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="unit" className={inputClass} />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                Cancel
              </button>
              <button type="button" onClick={addKeyResult} disabled={!title.trim()} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:opacity-40">
                Add
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowAdd(true)} className="text-xs font-semibold text-purple-300 transition hover:text-purple-200">
            + Add Key Result
          </button>
        )
      ) : null}
    </div>
  );
}
