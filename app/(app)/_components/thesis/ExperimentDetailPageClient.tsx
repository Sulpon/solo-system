"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../Card";
import { useExperimentEntries } from "../../_lib/hooks/useExperimentEntries";
import type { ExperimentEntry } from "../../_lib/types/experiment";

type ExperimentDetailPageClientProps = Readonly<{ experimentId: string }>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

const textFields: ReadonlyArray<{ key: keyof ExperimentEntry; label: string; placeholder: string }> = [
  { key: "objective", label: "Objective", placeholder: "What are you trying to find out?" },
  { key: "method", label: "Method", placeholder: "How did you run the experiment?" },
  { key: "results", label: "Results", placeholder: "What did you observe or measure?" },
  { key: "interpretation", label: "Interpretation", placeholder: "What do the results mean?" },
  { key: "conclusion", label: "Conclusion", placeholder: "What did you conclude?" },
  { key: "nextSteps", label: "Next Steps", placeholder: "What comes next?" },
];

export default function ExperimentDetailPageClient({ experimentId }: ExperimentDetailPageClientProps) {
  const router = useRouter();
  const { entries, setEntries, hasLoaded } = useExperimentEntries();

  if (!hasLoaded) {
    return null;
  }

  const entry = entries.find((experiment) => experiment.id === experimentId);

  if (!entry) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className={sectionLabelClass}>Experiment Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">This experiment no longer exists</h1>
        <p className="mt-3 text-sm text-slate-400">It may have been deleted. Head back to Research to pick another one.</p>
        <Link
          href="/thesis-hub/research"
          className="mt-5 inline-block rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          ← Back to Research
        </Link>
      </Card>
    );
  }

  function update(patch: Partial<ExperimentEntry>) {
    setEntries((current) => current.map((experiment) => (experiment.id === experimentId ? { ...experiment, ...patch } : experiment)));
  }

  function deleteExperiment() {
    setEntries((current) => current.filter((experiment) => experiment.id !== experimentId));
    router.push("/thesis-hub/research");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href="/thesis-hub/research"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← Research
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={sectionLabelClass}>Experiment</p>
            <input
              value={entry.title}
              onChange={(event) => update({ title: event.target.value })}
              className="mt-2 w-full max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-3xl font-black text-white outline-none transition focus:border-purple-400 focus:bg-slate-950/70"
              placeholder="Experiment Title"
            />
          </div>
          <button
            type="button"
            onClick={deleteExperiment}
            className="shrink-0 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Delete Experiment
          </button>
        </div>
      </div>

      {textFields.map((field) => (
        <Card key={field.key} className="p-5">
          <p className={labelClass}>{field.label}</p>
          <textarea
            value={entry[field.key]}
            onChange={(event) => update({ [field.key]: event.target.value } as Partial<ExperimentEntry>)}
            className={inputClass + " mt-3 min-h-24"}
            placeholder={field.placeholder}
          />
        </Card>
      ))}
    </div>
  );
}
