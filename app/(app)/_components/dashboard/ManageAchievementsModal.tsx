"use client";

import { useState } from "react";
import Modal from "../Modal";
import type { AchievementCandidate } from "../../_lib/engines/dashboard-personalization-engine";
import type { ManualAchievementDraft } from "../../_lib/hooks/useManualAchievements";
import { MANUAL_ACHIEVEMENT_ICONS } from "../../_lib/types/manual-achievement";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-amber-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

const ICON_GLYPHS: Record<string, string> = { trophy: "🏆", star: "⭐", flame: "🔥", medal: "🥇", crown: "👑", target: "🎯", book: "📖", heart: "❤️" };

type ManageAchievementsModalProps = Readonly<{
  candidates: ReadonlyArray<AchievementCandidate>;
  selectedIds: ReadonlyArray<string>;
  onSave: (ids: ReadonlyArray<string>) => void;
  onAddManualAchievement: (draft: ManualAchievementDraft) => void;
  onDeleteManualAchievement: (id: string) => void;
  onClose: () => void;
}>;

export default function ManageAchievementsModal({ candidates, selectedIds, onSave, onAddManualAchievement, onDeleteManualAchievement, onClose }: ManageAchievementsModalProps) {
  const [checked, setChecked] = useState(new Set(selectedIds));
  const [showManualForm, setShowManualForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState<(typeof MANUAL_ACHIEVEMENT_ICONS)[number]>("trophy");
  const [category, setCategory] = useState("");
  const [achievedAt, setAchievedAt] = useState("");

  function toggle(id: string) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddManual() {
    if (!title.trim()) return;
    onAddManualAchievement({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      category: category.trim() || undefined,
      achievedAt: achievedAt ? new Date(`${achievedAt}T00:00:00`).toISOString() : undefined,
    });
    setTitle("");
    setDescription("");
    setCategory("");
    setAchievedAt("");
    setIcon("trophy");
    setShowManualForm(false);
  }

  return (
    <Modal title="Manage Achievements" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <p className={labelClass}>Achievements</p>
          {/* Capped and independently scrollable - real achievements (e.g.
              a workout PR per exercise) can easily number in the dozens,
              which must never push "+ Add Achievement" or the Save/Cancel
              footer below what's reachable without scrolling. */}
          <div className="mt-2 max-h-[40vh] space-y-1.5 overflow-y-auto pr-1">
            {candidates.length === 0 ? (
              <p className="text-sm text-slate-500">Nothing unlocked yet - complete quests, goals, or add one manually below.</p>
            ) : (
              candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2">
                  <label className="flex min-w-0 flex-1 items-center gap-2.5">
                    <input type="checkbox" checked={checked.has(candidate.id)} onChange={() => toggle(candidate.id)} className="accent-amber-500" />
                    <span className="shrink-0">{candidate.source === "manual" ? ICON_GLYPHS[candidate.icon ?? "trophy"] : "🏆"}</span>
                    <span className="min-w-0 truncate text-sm text-slate-200">{candidate.title}</span>
                  </label>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.08em] text-slate-600">{candidate.source === "real" ? "Verified by Atlas" : "Added manually"}</span>
                    {candidate.source === "manual" ? (
                      <button type="button" onClick={() => onDeleteManualAchievement(candidate.sourceId)} title="Delete this manual achievement" className="text-xs text-slate-600 transition hover:text-rose-300">
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {showManualForm ? (
          <div className="space-y-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-4">
            <label className="block space-y-1.5">
              <span className={labelClass}>Title</span>
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Finished My MSc" autoFocus className={inputClass} />
            </label>
            <label className="block space-y-1.5">
              <span className={labelClass}>Description (optional)</span>
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} placeholder="Completed my Master's thesis and graduated." className={inputClass} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className={labelClass}>Category (optional)</span>
                <input value={category} onChange={(event) => setCategory(event.target.value)} className={inputClass} />
              </label>
              <label className="space-y-1.5">
                <span className={labelClass}>Date (optional)</span>
                <input type="date" value={achievedAt} onChange={(event) => setAchievedAt(event.target.value)} className={inputClass} />
              </label>
            </div>
            <div className="space-y-1.5">
              <span className={labelClass}>Icon</span>
              <div className="flex flex-wrap gap-2">
                {MANUAL_ACHIEVEMENT_ICONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setIcon(option)}
                    className={"flex h-9 w-9 items-center justify-center rounded-lg border text-lg transition " + (icon === option ? "border-amber-400/60 bg-amber-500/15" : "border-slate-700 bg-slate-950/60 hover:border-amber-400/40")}
                  >
                    {ICON_GLYPHS[option]}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500">This is added manually - Atlas can&apos;t verify it automatically the way it verifies quest, goal, and PR achievements.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setShowManualForm(false)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:text-white">
                Cancel
              </button>
              <button type="button" onClick={handleAddManual} disabled={!title.trim()} className="rounded-lg border border-amber-400/50 bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40">
                Add Achievement
              </button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={() => setShowManualForm(true)} className="w-full rounded-xl border border-dashed border-slate-700 px-3 py-2 text-xs font-semibold text-slate-400 transition hover:border-amber-400/50 hover:text-white">
            + Add Achievement
          </button>
        )}

        <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(Array.from(checked));
              onClose();
            }}
            className="rounded-xl border border-amber-400/50 bg-amber-500/15 px-4 py-2 text-sm font-semibold text-amber-100 transition hover:bg-amber-500/25"
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
