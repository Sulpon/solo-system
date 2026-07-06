"use client";

import type { Category, CategoryId } from "../../../_lib/types/category";

type DreamStepProps = Readonly<{
  attributes: Category[];
  title: string;
  description: string;
  icon: string;
  selectedAttributeIds: CategoryId[];
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeIcon: (value: string) => void;
  onToggleAttribute: (attributeId: CategoryId) => void;
  onContinue: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function DreamStep({
  attributes,
  title,
  description,
  icon,
  selectedAttributeIds,
  onChangeTitle,
  onChangeDescription,
  onChangeIcon,
  onToggleAttribute,
  onContinue,
}: DreamStepProps) {
  const canContinue = title.trim().length > 0 && selectedAttributeIds.length > 0;
  const selectedAttributes = attributes.filter((attribute) => selectedAttributeIds.includes(attribute.id));

  return (
    <div>
      <h2 className="text-2xl font-black leading-snug text-white sm:text-[1.65rem]">What kind of person do you want to become?</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
        A Dream is the long-term vision everything else in Atlas ladders up to. Give it a name that pulls you forward.
      </p>

      {/* Live preview, styled like a real Dream card inside Atlas */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-purple-500/25 bg-[linear-gradient(135deg,rgba(15,23,42,0.76),rgba(2,6,23,0.94))] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-xl font-black text-white">
            {icon.trim() ? `${icon.trim()} ` : ""}
            {title.trim() || "Your dream's name"}
          </h3>
          <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-purple-300">
            Dream
          </span>
        </div>
        <p className="mt-2 text-sm text-slate-400">{description.trim() || "A short description of where this dream leads."}</p>
        {selectedAttributes.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {selectedAttributes.map((attribute) => (
              <span key={attribute.id} className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2.5 py-1 text-[11px] font-semibold text-cyan-100">
                {attribute.icon} {attribute.name}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-[80px_1fr]">
        <label className="space-y-2">
          <span className={labelClass}>Icon</span>
          <input value={icon} onChange={(event) => onChangeIcon(event.target.value.slice(0, 2))} maxLength={2} className={inputClass + " text-center"} placeholder="🚀" />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Title</span>
          <input value={title} onChange={(event) => onChangeTitle(event.target.value)} className={inputClass} placeholder="Become a professional trader" />
        </label>
      </div>

      <label className="mt-4 block space-y-2">
        <span className={labelClass}>Description</span>
        <textarea
          value={description}
          onChange={(event) => onChangeDescription(event.target.value)}
          className={inputClass + " min-h-24"}
          placeholder="Optional context for this dream"
        />
      </label>

      <div className="mt-6">
        <p className={labelClass}>Which attributes does this dream draw on?</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {attributes.map((attribute) => {
            const selected = selectedAttributeIds.includes(attribute.id);

            return (
              <button
                key={attribute.id}
                type="button"
                onClick={() => onToggleAttribute(attribute.id)}
                className={
                  "flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm transition " +
                  (selected
                    ? "border-purple-400/50 bg-purple-500/15 text-white"
                    : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-purple-400/30 hover:text-white")
                }
              >
                <span className="font-semibold">
                  {attribute.icon} {attribute.name}
                </span>
                <span className={"text-xs uppercase tracking-[0.18em] " + (selected ? "text-purple-200" : "text-slate-500")}>{selected ? "Selected" : "Off"}</span>
              </button>
            );
          })}
        </div>
      </div>

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
