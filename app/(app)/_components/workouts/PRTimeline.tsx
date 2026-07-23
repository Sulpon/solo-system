"use client";

import type { PersonalRecordEvent, PersonalRecordType } from "../../_lib/types/workout";

const PERSONAL_RECORD_LABELS: Readonly<Record<PersonalRecordType, string>> = {
  max_weight: "Max Weight",
  max_volume: "Max Volume",
  max_reps: "Max Reps",
  longest_session: "Longest Session",
  most_sets: "Most Sets",
  best_estimated_1rm: "Best Estimated 1RM",
};

function formatValue(record: PersonalRecordEvent) {
  if (record.type === "longest_session") {
    return `${Math.round(record.value / 60)} min`;
  }

  return record.unit ? `${record.value.toLocaleString()} ${record.unit}` : record.value.toLocaleString();
}

type PRTimelineProps = Readonly<{
  records: ReadonlyArray<PersonalRecordEvent>;
  emptyText?: string;
}>;

export default function PRTimeline({ records, emptyText = "No personal records yet." }: PRTimelineProps) {
  if (records.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-4 text-sm text-slate-400">{emptyText}</div>;
  }

  const sorted = [...records].sort((first, second) => new Date(second.achievedAt).getTime() - new Date(first.achievedAt).getTime());

  return (
    <div className="space-y-2">
      {sorted.map((record) => (
        <div key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{record.exerciseName ? `${record.exerciseName} · ${PERSONAL_RECORD_LABELS[record.type]}` : PERSONAL_RECORD_LABELS[record.type]}</p>
            <p className="mt-0.5 text-xs text-slate-500">{new Date(record.achievedAt).toLocaleDateString()}</p>
          </div>
          <span className="shrink-0 text-sm font-bold text-amber-300">{formatValue(record)}</span>
        </div>
      ))}
    </div>
  );
}
