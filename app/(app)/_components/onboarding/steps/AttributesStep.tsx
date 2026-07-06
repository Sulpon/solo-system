"use client";

import { MAX_ONBOARDING_ATTRIBUTES, MIN_ONBOARDING_ATTRIBUTES, ONBOARDING_ATTRIBUTE_PRESETS, ONBOARDING_COLOR_OPTIONS, generateAttributeId } from "../../../_lib/onboarding";
import type { Category } from "../../../_lib/types/category";

type AttributesStepProps = Readonly<{
  attributes: Category[];
  onChange: (next: Category[]) => void;
  onContinue: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

export default function AttributesStep({ attributes, onChange, onContinue }: AttributesStepProps) {
  const atMax = attributes.length >= MAX_ONBOARDING_ATTRIBUTES;
  const canContinue = attributes.length >= MIN_ONBOARDING_ATTRIBUTES && attributes.length <= MAX_ONBOARDING_ATTRIBUTES;

  function addPreset(preset: Category) {
    if (atMax) {
      return;
    }

    const id = generateAttributeId(preset.name, attributes.map((item) => item.id));
    onChange([...attributes, { ...preset, id }]);
  }

  function addCustom() {
    if (atMax) {
      return;
    }

    const id = generateAttributeId("New Attribute", attributes.map((item) => item.id));
    onChange([...attributes, { id, name: "New Attribute", icon: "?", accent: ONBOARDING_COLOR_OPTIONS[attributes.length % ONBOARDING_COLOR_OPTIONS.length].value }]);
  }

  function updateAttribute(index: number, patch: Partial<Category>) {
    onChange(attributes.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function removeAttribute(index: number) {
    if (attributes.length <= MIN_ONBOARDING_ATTRIBUTES) {
      return;
    }

    onChange(attributes.filter((_, itemIndex) => itemIndex !== index));
  }

  const addedNames = new Set(attributes.map((item) => item.name.toLowerCase()));

  function togglePreset(preset: Category) {
    const existingIndex = attributes.findIndex((item) => item.name.toLowerCase() === preset.name.toLowerCase());

    if (existingIndex >= 0) {
      removeAttribute(existingIndex);
      return;
    }

    addPreset(preset);
  }

  return (
    <div>
      <h2 className="text-2xl font-black leading-snug text-white sm:text-[1.65rem]">Choose the abilities that define your character.</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
        Select between {MIN_ONBOARDING_ATTRIBUTES} and {MAX_ONBOARDING_ATTRIBUTES}. Every one you choose becomes a stat your character levels up over time.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {ONBOARDING_ATTRIBUTE_PRESETS.map((preset) => {
          const selected = addedNames.has(preset.name.toLowerCase());
          const disabled = !selected && atMax;

          return (
            <button
              key={preset.id}
              type="button"
              disabled={disabled}
              onClick={() => togglePreset(preset)}
              className={
                "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 " +
                (selected
                  ? "border-purple-400/60 bg-purple-500/10 shadow-[0_0_28px_rgba(168,85,247,0.16)]"
                  : "border-slate-800 bg-slate-950/45 hover:border-purple-400/30 hover:bg-slate-900/50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-800 disabled:hover:bg-slate-950/45")
              }
            >
              {selected ? (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-purple-500 text-[11px] font-bold text-white">
                  ✓
                </span>
              ) : null}
              <div className="flex items-center gap-3">
                <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-slate-950 " + preset.accent}>
                  {preset.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-white">{preset.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{preset.description}</p>
                </div>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={addCustom}
          disabled={atMax}
          className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/30 p-4 text-sm font-semibold text-slate-400 transition hover:border-cyan-400/40 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Create Your Own
        </button>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Your Roster</p>
        <span className={"text-xs font-semibold " + (canContinue ? "text-emerald-300" : "text-amber-300")}>
          {attributes.length} / {MAX_ONBOARDING_ATTRIBUTES} chosen
        </span>
      </div>

      {attributes.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">
          Select at least {MIN_ONBOARDING_ATTRIBUTES} abilities above to continue.
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {attributes.map((attribute, index) => (
            <div key={attribute.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-950/40 p-2.5">
              <span className={"flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-slate-950 " + attribute.accent}>
                {attribute.icon}
              </span>
              <input
                value={attribute.name}
                onChange={(event) => updateAttribute(index, { name: event.target.value })}
                className={inputClass + " min-w-[120px] flex-1 border-transparent bg-transparent px-1 py-1 focus:border-purple-400/50 focus:bg-slate-950/70"}
                aria-label="Attribute name"
              />
              <div className="flex shrink-0 items-center gap-1">
                {ONBOARDING_COLOR_OPTIONS.slice(0, 6).map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.label}
                    onClick={() => updateAttribute(index, { accent: color.value })}
                    className={
                      "h-4 w-4 rounded-full " + color.value + " " + (attribute.accent === color.value ? "ring-2 ring-white" : "opacity-50 hover:opacity-90")
                    }
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={() => removeAttribute(index)}
                disabled={attributes.length <= MIN_ONBOARDING_ATTRIBUTES}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-500 transition hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={`Remove ${attribute.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

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
