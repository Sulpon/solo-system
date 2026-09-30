"use client";

import { Trophy } from "lucide-react";
import ThemeEmptyState from "../theme/ThemeEmptyState";
import ThemeSection from "../theme/ThemeSection";
import { getPersonalRecords } from "../../_lib/engines/workout-engine";
import type { PersonalRecordEvent, WorkoutSession } from "../../_lib/types/workout";

const RECORD_LABELS: Readonly<Record<PersonalRecordEvent["type"], string>> = {
  max_weight: "Max weight",
  max_volume: "Max volume",
  max_reps: "Max reps",
  longest_session: "Longest session",
  most_sets: "Most sets",
  best_estimated_1rm: "Best estimated 1RM",
};

function formatValue(record: PersonalRecordEvent) {
  if (record.type === "longest_session") {
    return `${Math.round(record.value / 60)} min`;
  }

  return record.unit ? `${record.value.toLocaleString()} ${record.unit}` : record.value.toLocaleString();
}

// The Hall of Fame is a record board, not a leaderboard.
//
// Atlas stores one person's training data and has no other athletes to
// rank against, so there is deliberately no ranking, no percentile and no
// opponent here - inventing any of those is exactly the fabrication the
// data-integrity rules forbid. Every row below is an existing
// PersonalRecordEvent that workout-engine.ts already detected when a real
// session was finished; nothing is recomputed or embellished.
export default function HallOfFame({ sessions }: Readonly<{ sessions: ReadonlyArray<WorkoutSession> }>) {
  const records = getPersonalRecords(sessions)
    .slice()
    .sort((first, second) => new Date(second.achievedAt).getTime() - new Date(first.achievedAt).getTime());

  if (records.length === 0) {
    return (
      <ThemeSection eyebrow="Hall of Fame" title="Personal records" description="Records Atlas detected when you finished a session.">
        <ThemeEmptyState
          testId="hall-of-fame-empty"
          icon={Trophy}
          title="No personal records yet"
          description="A record is created the moment a finished workout beats your own previous best. None have been set yet, so there is nothing to show."
        />
      </ThemeSection>
    );
  }

  return (
    <ThemeSection eyebrow="Hall of Fame" title="Personal records" description={`${records.length} record${records.length === 1 ? "" : "s"} set against your own previous bests.`}>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {records.slice(0, 12).map((record) => (
          <div key={record.id} className="atlas-surface rounded-xl border p-4">
            <p className="atlas-accent text-[0.65rem] font-semibold uppercase tracking-[0.2em]">{RECORD_LABELS[record.type]}</p>
            <p className="atlas-display mt-2 text-xl font-bold text-white">{formatValue(record)}</p>
            <p className="atlas-muted mt-1 truncate text-xs">
              {record.exerciseName ?? "Whole session"} · {new Date(record.achievedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
            </p>
          </div>
        ))}
      </div>
    </ThemeSection>
  );
}
