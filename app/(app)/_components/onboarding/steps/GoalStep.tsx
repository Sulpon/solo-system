"use client";

type ChildKind = "none" | "milestone" | "progress_goal";

type GoalStepProps = Readonly<{
  dreamTitle: string;
  title: string;
  description: string;
  childKind: ChildKind;
  childTitle: string;
  childTargetValue: number;
  childUnit: string;
  onChangeTitle: (value: string) => void;
  onChangeDescription: (value: string) => void;
  onChangeChildKind: (value: ChildKind) => void;
  onChangeChildTitle: (value: string) => void;
  onChangeChildTargetValue: (value: number) => void;
  onChangeChildUnit: (value: string) => void;
  onContinue: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

const HIERARCHY = ["Dream", "Goal", "Milestone", "Progress Goal", "Quest"] as const;

function HierarchyTrail() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-1.5">
      {HIERARCHY.map((level, index) => {
        const isCurrent = level === "Goal";

        return (
          <div key={level} className="flex items-center gap-1.5">
            <span
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition " +
                (isCurrent ? "border-purple-400/60 bg-purple-500/15 text-purple-100 shadow-[0_0_16px_rgba(168,85,247,0.2)]" : "border-slate-800 bg-slate-950/45 text-slate-500")
              }
            >
              {level}
            </span>
            {index < HIERARCHY.length - 1 ? <span className="text-slate-700">→</span> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function GoalStep({
  dreamTitle,
  title,
  description,
  childKind,
  childTitle,
  childTargetValue,
  childUnit,
  onChangeTitle,
  onChangeDescription,
  onChangeChildKind,
  onChangeChildTitle,
  onChangeChildTargetValue,
  onChangeChildUnit,
  onContinue,
}: GoalStepProps) {
  const canContinue = title.trim().length > 0 && (childKind === "none" || childTitle.trim().length > 0);

  return (
    <div>
      <h2 className="text-2xl font-black leading-snug text-white sm:text-[1.65rem]">Chart the first leg of the journey.</h2>
      <p className="mt-3 max-w-lg text-sm leading-6 text-slate-400">
        This goal breaks down <span className="text-purple-200">{dreamTitle || "your dream"}</span> into something concrete.
      </p>

      <HierarchyTrail />

      <label className="mt-6 block space-y-2">
        <span className={labelClass}>Goal Title</span>
        <input value={title} onChange={(event) => onChangeTitle(event.target.value)} className={inputClass} placeholder="Build a consistent trading process" />
      </label>

      <label className="mt-4 block space-y-2">
        <span className={labelClass}>Description</span>
        <textarea
          value={description}
          onChange={(event) => onChangeDescription(event.target.value)}
          className={inputClass + " min-h-20"}
          placeholder="Optional context"
        />
      </label>

      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-950/45 p-4">
        <p className={labelClass}>Optionally add a child (keep it simple)</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              { value: "none", label: "None" },
              { value: "milestone", label: "Milestone" },
              { value: "progress_goal", label: "Progress Goal" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onChangeChildKind(option.value)}
              className={
                "rounded-xl border px-4 py-2 text-sm font-semibold transition " +
                (childKind === option.value
                  ? "border-purple-400/60 bg-purple-500/15 text-purple-100"
                  : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
              }
            >
              {option.label}
            </button>
          ))}
        </div>

        {childKind !== "none" ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="space-y-2 sm:col-span-3">
              <span className={labelClass}>{childKind === "milestone" ? "Milestone Title" : "Progress Goal Title"}</span>
              <input value={childTitle} onChange={(event) => onChangeChildTitle(event.target.value)} className={inputClass} placeholder="Name it" />
            </label>

            {childKind === "progress_goal" ? (
              <>
                <label className="space-y-2">
                  <span className={labelClass}>Target Value</span>
                  <input
                    type="number"
                    min={1}
                    value={childTargetValue}
                    onChange={(event) => onChangeChildTargetValue(Math.max(1, Number(event.target.value)))}
                    className={inputClass}
                  />
                </label>
                <label className="space-y-2 sm:col-span-2">
                  <span className={labelClass}>Unit</span>
                  <input value={childUnit} onChange={(event) => onChangeChildUnit(event.target.value)} className={inputClass} placeholder="trades, pages, workouts" />
                </label>
              </>
            ) : null}
          </div>
        ) : null}
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

export type { ChildKind };
