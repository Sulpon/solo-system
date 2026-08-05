"use client";

import Link from "next/link";
import type { ExperimentEntry } from "../../_lib/types/experiment";

type ExperimentCardProps = Readonly<{ experiment: ExperimentEntry }>;

export default function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <Link
      href={`/thesis-hub/research/experiments/${experiment.id}`}
      className="block rounded-xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-purple-400/50 hover:bg-slate-900/40"
    >
      <p className="truncate font-semibold text-white">{experiment.title || "Untitled Experiment"}</p>
      <p className="mt-2 line-clamp-2 text-xs text-slate-500">{experiment.objective || "No objective set yet."}</p>
    </Link>
  );
}
