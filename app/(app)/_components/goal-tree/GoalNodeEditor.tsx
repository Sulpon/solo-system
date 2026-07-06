"use client";

import Modal from "../Modal";
import { redistributeAttributeWeights } from "../../_lib/goal-tree-attributes";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import type { CategoryId } from "../../_lib/types/category";
import type { AttributeWeight, GoalNodeStatus, GoalNodeType, SequentialMilestoneStep } from "../../_lib/types/goal-tree";

export type GoalNodeFormState = Readonly<{
  id?: string;
  parentId?: string | null;
  title: string;
  description: string;
  attributes: CategoryId[];
  attributeWeights: AttributeWeight[];
  type: GoalNodeType;
  status: GoalNodeStatus;
  currentValue: number;
  targetValue: number;
  unit: string;
  steps: SequentialMilestoneStep[];
  currentStepIndex: number;
  completed: boolean;
}>;

type GoalNodeEditorProps = Readonly<{
  mode: "create" | "edit";
  form: GoalNodeFormState;
  parentTitle?: string;
  onChange: (next: GoalNodeFormState) => void;
  onClose: () => void;
  onSave: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const typeOptions: Array<{ value: GoalNodeType; label: string }> = [
  { value: "dream", label: "Dream" },
  { value: "long_term_goal", label: "Long Term Goal" },
  { value: "milestone", label: "Milestone" },
  { value: "quest", label: "Quest" },
  { value: "progress_goal", label: "Progress Goal" },
  { value: "sequential_milestone", label: "Sequential Milestone" },
];

const statusOptions: Array<{ value: GoalNodeStatus; label: string }> = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

export default function GoalNodeEditor({ mode, form, parentTitle, onChange, onClose, onSave }: GoalNodeEditorProps) {
  const { attributes: categories } = useAttributes();
  const isDream = form.type === "dream";
  const isProgressGoal = form.type === "progress_goal";
  const isSequential = form.type === "sequential_milestone";

  function rebuildWeights(attributeIds: ReadonlyArray<CategoryId>, focusId?: CategoryId, focusWeight?: number) {
    return redistributeAttributeWeights(attributeIds, focusId, focusWeight);
  }

  function getSequenceState(steps: SequentialMilestoneStep[]) {
    const completedCount = steps.filter((step) => step.completed).length;
    const currentStepIndex = steps.findIndex((step) => !step.completed);

    return {
      currentStepIndex: currentStepIndex >= 0 ? currentStepIndex : steps.length,
      completed: steps.length > 0 && completedCount === steps.length,
    };
  }

  function updateStep(stepId: string, updater: (current: SequentialMilestoneStep) => SequentialMilestoneStep) {
    const steps = form.steps.map((step) => (step.id === stepId ? updater(step) : step));
    onChange({
      ...form,
      steps,
      ...getSequenceState(steps),
    });
  }

  function addStep() {
    const steps = [...form.steps, { id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title: "", description: "", completed: false }];
    onChange({
      ...form,
      steps,
      ...getSequenceState(steps),
    });
  }

  function removeStep(stepId: string) {
    const steps = form.steps.filter((step) => step.id !== stepId);
    onChange({
      ...form,
      steps,
      ...getSequenceState(steps),
    });
  }

  function moveStep(stepId: string, direction: -1 | 1) {
    const index = form.steps.findIndex((step) => step.id === stepId);

    if (index < 0) {
      return;
    }

    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= form.steps.length) {
      return;
    }

    const nextSteps = [...form.steps];
    const [moved] = nextSteps.splice(index, 1);
    nextSteps.splice(targetIndex, 0, moved);

    onChange({
      ...form,
      steps: nextSteps,
      ...getSequenceState(nextSteps),
    });
  }

  return (
    <Modal title={mode === "edit" ? "Edit Goal Node" : "Create Goal Node"} onClose={onClose}>
      <div className="space-y-5">
        {parentTitle ? (
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
            Parent goal: <span className="font-semibold text-white">{parentTitle}</span>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Title</span>
            <input value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} className={inputClass} placeholder="Create your own goal name" />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Description</span>
            <textarea
              value={form.description}
              onChange={(event) => onChange({ ...form, description: event.target.value })}
              className={inputClass + " min-h-24"}
              placeholder="Optional context, intent, or notes"
            />
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Type</span>
            <select value={form.type} onChange={(event) => onChange({ ...form, type: event.target.value as GoalNodeType })} className={inputClass}>
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className={labelClass}>Status</span>
            <select value={form.status} onChange={(event) => onChange({ ...form, status: event.target.value as GoalNodeStatus })} className={inputClass}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isDream ? (
          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-200">Dream Attributes</p>
                <p className="mt-1 text-sm text-slate-400">These attributes will be inherited by all descendants of this dream.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.18em] text-slate-500">{form.attributes.length} selected</span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {categories.map((category) => {
                const selected = form.attributes.includes(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...form,
                        attributes: selected ? form.attributes.filter((attributeId) => attributeId !== category.id) : [...form.attributes, category.id],
                        attributeWeights: rebuildWeights(
                          selected ? form.attributes.filter((attributeId) => attributeId !== category.id) : [...form.attributes, category.id],
                        ),
                      })
                    }
                    className={
                      "flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition " +
                      (selected
                        ? "border-purple-400/50 bg-purple-500/15 text-white"
                        : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-purple-400/30 hover:text-white")
                    }
                  >
                    <span className="font-semibold">{category.name}</span>
                    <span className={"text-xs uppercase tracking-[0.18em] " + (selected ? "text-purple-200" : "text-slate-500")}>{selected ? "Inherited" : "Off"}</span>
                  </button>
                );
              })}
            </div>
            {form.attributes.length > 0 ? (
              <div className="mt-4 space-y-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Weight Split</p>
                  <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Total {form.attributeWeights.reduce((total, item) => total + item.weight, 0)}%</span>
                </div>
                <div className="space-y-3">
                  {form.attributeWeights.map((weight, index) => {
                    const category = categories.find((item) => item.id === weight.attributeId);

                    return (
                      <div key={weight.attributeId} className="grid gap-3 sm:grid-cols-[1fr_120px] sm:items-center">
                        <div className="rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-2">
                          <p className="text-sm font-semibold text-white">{category?.name ?? weight.attributeId}</p>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={weight.weight}
                            onChange={(event) => {
                              const nextWeights = rebuildWeights(
                                form.attributes,
                                weight.attributeId,
                                Number(event.target.value),
                              );
                              onChange({
                                ...form,
                                attributeWeights: nextWeights,
                              });
                            }}
                            className="mt-3 w-full accent-purple-500"
                          />
                        </div>
                        <label className="space-y-2">
                          <span className={labelClass}>Weight %</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={weight.weight}
                            onChange={(event) => {
                              const nextWeights = rebuildWeights(form.attributes, weight.attributeId, Number(event.target.value));
                              onChange({
                                ...form,
                                attributeWeights: nextWeights,
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
          </div>
        ) : null}

        {isProgressGoal ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Progress Goal</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <label className="space-y-2">
                <span className={labelClass}>Current Value</span>
                <input
                  type="number"
                  min={0}
                  value={form.currentValue}
                  onChange={(event) => onChange({ ...form, currentValue: Number(event.target.value) })}
                  className={inputClass}
                  placeholder="0"
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Target Value</span>
                <input
                  type="number"
                  min={1}
                  value={form.targetValue}
                  onChange={(event) => onChange({ ...form, targetValue: Math.max(1, Number(event.target.value)) })}
                  className={inputClass}
                  placeholder="100"
                />
              </label>
              <label className="space-y-2">
                <span className={labelClass}>Unit</span>
                <input
                  value={form.unit}
                  onChange={(event) => onChange({ ...form, unit: event.target.value })}
                  className={inputClass}
                  placeholder="trades, pages, workouts"
                />
              </label>
            </div>
          </div>
        ) : null}

        {isSequential ? (
          <div className="rounded-2xl border border-purple-400/20 bg-purple-500/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-200">Sequential Milestone</p>
                <p className="mt-1 text-sm text-slate-400">Add steps, then complete them one at a time from the node card.</p>
              </div>
              <button
                type="button"
                onClick={addStep}
                className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
              >
                Add Step
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {form.steps.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">Add the first step to start the sequence.</div>
              ) : (
                form.steps.map((step, index) => (
                  <div key={step.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-3">
                        <label className="block space-y-2">
                          <span className={labelClass}>Step Title</span>
                          <input
                            value={step.title}
                            onChange={(event) =>
                              updateStep(step.id, (current) => ({
                                ...current,
                                title: event.target.value,
                              }))
                            }
                            className={inputClass}
                            placeholder="First objective"
                          />
                        </label>

                        <label className="block space-y-2">
                          <span className={labelClass}>Description</span>
                          <textarea
                            value={step.description ?? ""}
                            onChange={(event) =>
                              updateStep(step.id, (current) => ({
                                ...current,
                                description: event.target.value,
                              }))
                            }
                            className={inputClass + " min-h-20"}
                            placeholder="Optional note"
                          />
                        </label>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button type="button" onClick={() => moveStep(step.id, -1)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:text-white">
                          Move Up
                        </button>
                        <button type="button" onClick={() => moveStep(step.id, 1)} className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:text-white">
                          Move Down
                        </button>
                        <button type="button" onClick={() => removeStep(step.id)} className="rounded-lg border border-rose-500/35 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-100 transition hover:border-rose-300 hover:text-white">
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500">
                      <span>Step {index + 1}</span>
                      <span>{step.completed ? "Completed" : "Pending"}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        {isSequential ? (
          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Sequence State</p>
            <p className="mt-2">{form.steps.length > 0 ? `Current step index: ${form.currentStepIndex + 1}` : "No steps yet"}</p>
            <p className="mt-1">Completed: {form.completed ? "Yes" : "No"}</p>
          </div>
        ) : null}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
            Cancel
          </button>
          <button type="button" onClick={onSave} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            Save Goal
          </button>
        </div>
      </div>
    </Modal>
  );
}
