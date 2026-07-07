"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "../Modal";
import { calculateQuestAttributeXP, buildDefaultAttributeWeights } from "../../_lib/goal-tree-attributes";
import { getInheritedAttributeWeights, getInheritedAttributes } from "../../_lib/goal-tree-storage";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import type { CategoryId } from "../../_lib/types/category";
import type { AttributeWeight } from "../../_lib/types/goal-tree";
import type { QuestAttributeReward, QuestCadence, QuestImportance } from "../../_lib/types/quest";

type QuestFormModel = Readonly<{
  id?: string;
  title: string;
  description: string;
  categoryId: CategoryId;
  xp: number;
  cadence: QuestCadence;
  importance: QuestImportance;
  scheduledDays: number[];
  active: boolean;
  linkedProgressGoalId: string | null;
  useInheritedAttributeDistribution: boolean;
  attributeXPOverride: QuestAttributeReward[];
  inheritedAttributeIds: CategoryId[];
  inheritedAttributeWeights: AttributeWeight[];
}>;

type QuestFormProps = Readonly<{
  form: QuestFormModel;
  isEditing: boolean;
  onChange: (nextForm: QuestFormModel) => void;
  onCancel: () => void;
  onSave: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const weekdays = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
] as const;

function sameIds(first: ReadonlyArray<CategoryId>, second: ReadonlyArray<CategoryId>) {
  return first.length === second.length && first.every((value, index) => value === second[index]);
}

function sameWeights(first: ReadonlyArray<AttributeWeight>, second: ReadonlyArray<AttributeWeight>) {
  return first.length === second.length && first.every((value, index) => value.attributeId === second[index]?.attributeId && value.weight === second[index]?.weight);
}

function redistributeManualRewards(rewards: ReadonlyArray<QuestAttributeReward>, changedIndex: number, nextXp: number, totalXp: number) {
  if (rewards.length === 0) {
    return [];
  }

  const safeTotal = Math.max(0, Math.floor(totalXp));
  const safeValue = Math.max(0, Math.min(safeTotal, Math.floor(nextXp)));

  if (rewards.length === 1) {
    return [{ ...rewards[0], xp: safeTotal }];
  }

  const ids = rewards.map((reward) => reward.attributeId);
  const changedId = ids[changedIndex];
  const remaining = safeTotal - safeValue;
  const otherIds = ids.filter((id) => id !== changedId);
  const base = Math.floor(remaining / otherIds.length);
  let remainder = remaining % otherIds.length;

  return ids.map((attributeId) => {
    if (attributeId === changedId) {
      return { attributeId, xp: safeValue };
    }

    const bonus = remainder > 0 ? 1 : 0;
    remainder -= bonus;
    return { attributeId, xp: base + bonus };
  });
}

export default function QuestForm({ form, isEditing, onChange, onCancel, onSave }: QuestFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { attributes: categories } = useAttributes();
  const { goalTree, progressGoals } = useGoalTree();
  const linkedGoalOptions = useMemo(() => [...progressGoals].sort((first, second) => first.title.localeCompare(second.title)), [progressGoals]);
  const inheritedAttributeIds = useMemo(
    () => (form.linkedProgressGoalId ? getInheritedAttributes(goalTree, form.linkedProgressGoalId) : form.inheritedAttributeIds),
    [form.inheritedAttributeIds, form.linkedProgressGoalId, goalTree],
  );
  const inheritedAttributeWeights = useMemo(
    () => (form.linkedProgressGoalId ? getInheritedAttributeWeights(goalTree, form.linkedProgressGoalId) : form.inheritedAttributeWeights),
    [form.inheritedAttributeWeights, form.linkedProgressGoalId, goalTree],
  );

  const inheritedRewards = useMemo(
    () => calculateQuestAttributeXP(form.xp, inheritedAttributeWeights.length > 0 ? inheritedAttributeWeights : buildDefaultAttributeWeights(inheritedAttributeIds), undefined),
    [form.xp, inheritedAttributeIds, inheritedAttributeWeights],
  );

  const manualRewards = useMemo(
    () =>
      form.attributeXPOverride.length > 0
        ? form.attributeXPOverride
        : calculateQuestAttributeXP(
            form.xp,
            inheritedAttributeWeights.length > 0 ? inheritedAttributeWeights : buildDefaultAttributeWeights(inheritedAttributeIds),
            undefined,
          ),
    [form.attributeXPOverride, form.xp, inheritedAttributeIds, inheritedAttributeWeights],
  );

  useEffect(() => {
    if (!form.linkedProgressGoalId) {
      return;
    }

    if (sameIds(form.inheritedAttributeIds, inheritedAttributeIds) && sameWeights(form.inheritedAttributeWeights, inheritedAttributeWeights)) {
      return;
    }

    onChange({
      ...form,
      inheritedAttributeIds,
      inheritedAttributeWeights,
      categoryId: inheritedAttributeIds[0] ?? form.categoryId,
      attributeXPOverride: form.useInheritedAttributeDistribution ? [] : form.attributeXPOverride,
    });
  }, [form, inheritedAttributeIds, inheritedAttributeWeights, onChange]);

  const hasInheritedAttributes = inheritedAttributeIds.length > 0;
  const activeRewards = form.useInheritedAttributeDistribution ? inheritedRewards : manualRewards;
  const usesCustomSchedule = form.scheduledDays.length > 0;

  return (
    <Modal title={isEditing ? "Edit Quest" : "Create Quest"} onClose={onCancel}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 sm:col-span-2">
          <span className={labelClass}>Title</span>
          <input autoFocus value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} className={inputClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Cadence</span>
          <select value={form.cadence} onChange={(event) => onChange({ ...form, cadence: event.target.value as QuestCadence })} className={inputClass}>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="one-time">One-Time</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Importance</span>
          <select value={form.importance} onChange={(event) => onChange({ ...form, importance: event.target.value as QuestImportance })} className={inputClass}>
            <option value="core">Core</option>
            <option value="bonus">Bonus</option>
          </select>
        </label>
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 sm:col-span-2">
          <div>
            <p className={labelClass}>Schedule</p>
            <p className="mt-1 text-sm text-slate-400">Choose when this quest appears in the daily system.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...form, scheduledDays: [] })}
              className={
                "rounded-xl border px-3 py-2 text-sm font-semibold transition " +
                (!usesCustomSchedule ? "border-purple-400/60 bg-purple-500/15 text-purple-100" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
              }
            >
              Every day
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...form, scheduledDays: [1, 2, 3, 4, 5] })}
              className={
                "rounded-xl border px-3 py-2 text-sm font-semibold transition " +
                (usesCustomSchedule ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-100" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-cyan-400/40 hover:text-white")
              }
            >
              Custom days
            </button>
          </div>
          {usesCustomSchedule ? (
            <div className="grid gap-2 sm:grid-cols-7">
              {weekdays.map((day) => {
                const checked = form.scheduledDays.includes(day.value);

                return (
                  <label
                    key={day.value}
                    className={
                      "flex cursor-pointer items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm transition " +
                      (checked ? "border-purple-400/60 bg-purple-500/15 text-purple-100" : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
                    }
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) => {
                        const nextDays = event.target.checked
                          ? [...form.scheduledDays, day.value]
                          : form.scheduledDays.filter((value) => value !== day.value);
                        onChange({ ...form, scheduledDays: [...new Set(nextDays)].sort((first, second) => first - second) });
                      }}
                      className="accent-purple-500"
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          ) : null}
        </div>
        <label className="space-y-2 sm:col-span-2">
          <span className={labelClass}>Goal Link (optional)</span>
          <select
            value={form.linkedProgressGoalId ?? ""}
            onChange={(event) => {
              const linkedProgressGoalId = event.target.value || null;
              const nextInheritedIds = linkedProgressGoalId ? getInheritedAttributes(goalTree, linkedProgressGoalId) : [];
              const nextInheritedWeights = linkedProgressGoalId ? getInheritedAttributeWeights(goalTree, linkedProgressGoalId) : [];
              const fallbackWeights = nextInheritedWeights.length > 0 ? nextInheritedWeights : buildDefaultAttributeWeights(nextInheritedIds);

              onChange({
                ...form,
                linkedProgressGoalId,
                inheritedAttributeIds: nextInheritedIds,
                inheritedAttributeWeights: fallbackWeights,
                categoryId: nextInheritedIds[0] ?? form.categoryId,
                useInheritedAttributeDistribution: true,
                attributeXPOverride: [],
              });
            }}
            className={inputClass}
          >
            <option value="">None</option>
            {linkedGoalOptions.map((goal) => {
              const currentValue = Math.max(0, Number(goal.currentValue ?? 0));
              const targetValue = Math.max(1, Number(goal.targetValue ?? 1));
              const unit = goal.unit?.trim();

              return (
                <option key={goal.id} value={goal.id}>
                  {goal.title} ({currentValue.toLocaleString()} / {targetValue.toLocaleString()}
                  {unit ? ` ${unit}` : ""})
                </option>
              );
            })}
          </select>
        </label>

        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="text-sm font-semibold text-purple-300 transition hover:text-purple-100"
          >
            {showAdvanced ? "Hide Advanced Settings" : "Advanced Settings"}
          </button>
        </div>

        {showAdvanced ? (
          <>
            <label className="space-y-2 sm:col-span-2">
              <span className={labelClass}>Description</span>
              <textarea value={form.description} onChange={(event) => onChange({ ...form, description: event.target.value })} className={inputClass + " min-h-24"} />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>XP</span>
              <input type="number" min={0} value={form.xp} onChange={(event) => onChange({ ...form, xp: Number(event.target.value) })} className={inputClass} />
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/45 px-3 py-2 text-sm text-slate-300">
              <input type="checkbox" checked={form.active} onChange={(event) => onChange({ ...form, active: event.target.checked })} className="accent-purple-500" />
              Active
            </label>

            <div className="sm:col-span-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Inherited Attributes</p>
              <p className="mt-1 text-sm text-slate-400">
                {form.linkedProgressGoalId ? "These attributes come from the selected progress goal." : "Link a progress goal to inherit attributes."}
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={form.useInheritedAttributeDistribution}
                onChange={(event) => {
                  const useInheritedAttributeDistribution = event.target.checked;

                  onChange({
                    ...form,
                    useInheritedAttributeDistribution,
                    attributeXPOverride: useInheritedAttributeDistribution ? [] : inheritedRewards,
                  });
                }}
                className="accent-purple-500"
              />
              Use inherited distribution
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2 text-right text-xs text-slate-400">
            <p className={labelClass}>Quest XP</p>
            <p className="mt-1 text-base font-semibold text-white">{form.xp.toLocaleString()}</p>
          </div>

          <div className="mt-4 space-y-3">
            {hasInheritedAttributes ? (
              <>
                <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Inherited Weights</p>
                  <div className="mt-3 space-y-2">
                    {(inheritedAttributeWeights.length > 0 ? inheritedAttributeWeights : buildDefaultAttributeWeights(inheritedAttributeIds)).map((weight) => {
                      const category = categories.find((item) => item.id === weight.attributeId);
                      const reward = activeRewards.find((item) => item.attributeId === weight.attributeId);

                      return (
                        <div key={weight.attributeId} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                          <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2 text-sm text-slate-300">
                            <p className="font-semibold text-white">{category?.name ?? weight.attributeId}</p>
                            <p className="mt-1 text-xs text-slate-500">{weight.weight}% of quest XP</p>
                          </div>
                          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-right text-sm text-cyan-100">
                            <p className="text-xs uppercase tracking-[0.18em] text-cyan-200">Allocated</p>
                            <p className="mt-1 font-semibold">{reward?.xp.toLocaleString() ?? 0} XP</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {!form.useInheritedAttributeDistribution ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Manual XP Override</p>
                    <p className="mt-1 text-sm text-slate-400">Adjust the split manually. It will stay aligned to the quest XP total.</p>
                    <div className="mt-3 space-y-3">
                      {manualRewards.map((reward, index) => {
                        const category = categories.find((item) => item.id === reward.attributeId);

                        return (
                          <div key={reward.attributeId} className="grid gap-3 sm:grid-cols-[1fr_140px] sm:items-center">
                            <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2 text-sm text-slate-300">
                              <p className="font-semibold text-white">{category?.name ?? reward.attributeId}</p>
                              <p className="mt-1 text-xs text-slate-500">Manual override amount</p>
                            </div>
                            <label className="space-y-2">
                              <span className={labelClass}>XP Reward</span>
                              <input
                                type="number"
                                min={0}
                                value={reward.xp}
                                onChange={(event) => {
                                  const nextRewards = redistributeManualRewards(manualRewards, index, Number(event.target.value), form.xp);
                                  onChange({
                                    ...form,
                                    attributeXPOverride: nextRewards,
                                    categoryId: nextRewards[0]?.attributeId ?? form.categoryId,
                                  });
                                }}
                                className={inputClass}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">
                No inherited attributes yet.
              </div>
            )}
          </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button type="button" onClick={onSave} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
          Save Quest
        </button>
      </div>
    </Modal>
  );
}

export type { QuestFormModel };
