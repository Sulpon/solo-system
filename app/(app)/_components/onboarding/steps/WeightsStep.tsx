"use client";

import { redistributeAttributeWeights } from "../../../_lib/goal-tree-attributes";
import type { AttributeWeight } from "../../../_lib/types/goal-tree";
import type { Category, CategoryId } from "../../../_lib/types/category";

type WeightsStepProps = Readonly<{
  attributes: Category[];
  selectedAttributeIds: CategoryId[];
  weights: AttributeWeight[];
  onChangeWeights: (next: AttributeWeight[]) => void;
  onContinue: () => void;
}>;

export default function WeightsStep({ attributes, selectedAttributeIds, weights, onChangeWeights, onContinue }: WeightsStepProps) {
  const total = weights.reduce((sum, weight) => sum + weight.weight, 0);
  const canContinue = total === 100;

  function handleWeightChange(attributeId: CategoryId, nextWeight: number) {
    onChangeWeights(redistributeAttributeWeights(selectedAttributeIds, attributeId, nextWeight));
  }

  return (
    <div>
      <h2 className="text-2xl font-black leading-snug text-white sm:text-[1.65rem]">What will this dream improve?</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
        Every action taken toward this dream will strengthen these attributes. Distribute 100 points across them to set the balance.
      </p>

      <div className="mt-6 space-y-4">
        {weights.map((weight) => {
          const attribute = attributes.find((item) => item.id === weight.attributeId);

          return (
            <div key={weight.attributeId} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-sm font-semibold text-white">
                  {attribute ? (
                    <span className={"flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-slate-950 " + attribute.accent}>{attribute.icon}</span>
                  ) : null}
                  {attribute?.name ?? weight.attributeId}
                </p>
                <span className="text-lg font-black text-purple-200">{weight.weight}%</span>
              </div>

              <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-[width] duration-150"
                  style={{ width: `${weight.weight}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={weight.weight}
                onChange={(event) => handleWeightChange(weight.attributeId, Number(event.target.value))}
                className="mt-2 w-full accent-purple-500"
                aria-label={`${attribute?.name ?? weight.attributeId} weight`}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/45 px-4 py-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Total</span>
        <span className={"text-lg font-black " + (canContinue ? "text-emerald-300" : "text-rose-300")}>{total}%</span>
      </div>

      {!canContinue ? <p className="mt-3 text-sm text-rose-300">Weights must add up to exactly 100% to continue.</p> : null}

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-6 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 hover:scale-[1.03] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
