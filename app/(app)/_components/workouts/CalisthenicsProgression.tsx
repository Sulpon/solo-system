"use client";

import { Dumbbell } from "lucide-react";
import ThemeEmptyState from "../theme/ThemeEmptyState";
import ThemeProgress from "../theme/ThemeProgress";
import ThemeSection from "../theme/ThemeSection";
import { getCalisthenicsOverview, getCalisthenicsProgress, sortProgressByRelevance } from "../../_lib/engines/calisthenics-engine";
import type { CalisthenicsSkillProgress } from "../../_lib/engines/calisthenics-engine";
import type { WorkoutSession } from "../../_lib/types/workout";

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function SkillRow({ progress }: Readonly<{ progress: CalisthenicsSkillProgress }>) {
  const { skill, attempted, best, milestonesReached, nextMilestone } = progress;
  const unit = skill.metric === "reps" ? "reps" : "logged";

  return (
    <div className="atlas-surface rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="atlas-display font-semibold text-white">{skill.name}</p>
        {attempted ? (
          <p className="atlas-accent text-sm font-semibold">
            {best} <span className="atlas-muted font-normal">{unit}</span>
          </p>
        ) : (
          // Never a "0" here: an untrained skill has no measurement, and a
          // zero would read as one.
          <p className="atlas-muted text-xs uppercase tracking-[0.18em]">Not logged yet</p>
        )}
      </div>

      {attempted ? (
        <>
          <ThemeProgress
            className="mt-3"
            value={milestonesReached}
            max={skill.ladder.length}
            valueLabel={nextMilestone === null ? "Ladder cleared" : `Next: ${nextMilestone} ${unit}`}
          />
          <p className="atlas-muted mt-2 text-xs">
            {progress.totalSets} set{progress.totalSets === 1 ? "" : "s"} across {progress.sessionCount} session{progress.sessionCount === 1 ? "" : "s"}
            {formatDate(progress.lastPerformedAt) ? ` · last trained ${formatDate(progress.lastPerformedAt)}` : ""}
          </p>
        </>
      ) : (
        <p className="atlas-muted mt-2 text-xs">Log a set named &ldquo;{skill.name}&rdquo; in a workout and it will appear here.</p>
      )}
    </div>
  );
}

// Skill progression read straight out of real WorkoutSession history.
//
// The ladder shown per skill is a fixed public checkpoint scale (1/5/10/…),
// and the number measured against it is always the user's own best real
// set. Nothing here ranks the user against anyone - Atlas holds one
// athlete's data, so any such ranking would be invented.
export default function CalisthenicsProgression({ sessions }: Readonly<{ sessions: ReadonlyArray<WorkoutSession> }>) {
  const progress = sortProgressByRelevance(getCalisthenicsProgress(sessions));
  const overview = getCalisthenicsOverview(progress);

  if (overview.skillsAttempted === 0) {
    return (
      <ThemeSection eyebrow="Progression" title="Skill ladder" description="Bodyweight skills Atlas recognises in your logged workouts.">
        <ThemeEmptyState
          testId="calisthenics-empty"
          icon={Dumbbell}
          title="No bodyweight skills logged yet"
          description="Finish a workout containing an exercise such as Pull-up, Dip or Muscle-up and its real progression appears here. Atlas will not estimate anything you have not done."
        />
      </ThemeSection>
    );
  }

  return (
    <ThemeSection
      eyebrow="Progression"
      title="Skill ladder"
      description={`${overview.skillsAttempted} of ${overview.skillsTotal} skills trained · ${overview.milestonesReached} of ${overview.milestonesTotal} checkpoints cleared.`}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {progress.map((item) => (
          <SkillRow key={item.skill.id} progress={item} />
        ))}
      </div>
    </ThemeSection>
  );
}
