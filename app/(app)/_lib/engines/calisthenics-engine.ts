import type { SetLog, WorkoutSession } from "../types/workout";

// Calisthenics skill progression, derived entirely from real logged sets in
// the EXISTING WorkoutSession history. No new storage, no new model, and no
// second workout engine - this reads workout-engine.ts's own data and adds
// one thing that engine does not do: recognising named bodyweight skills
// across free-text exercise names.
//
// What this deliberately does NOT do:
// - It invents no ranking, percentile, tier name or comparison to anyone
//   else. Atlas has exactly one athlete's data, so any "rank" would be
//   fabricated.
// - It fills nothing in. A skill with no matching logged set reports
//   attempted: false, and the UI shows an empty state rather than a zero
//   that reads like a measured result.
// - It converts no units. A hold logged as "30" is reported as 30 - Atlas
//   does not decide whether the user meant seconds or repetitions.

export type CalisthenicsMetric = "reps" | "hold";

export type CalisthenicsSkill = Readonly<{
  id: string;
  name: string;
  metric: CalisthenicsMetric;
  // Lowercased substrings that identify this skill in a free-text exercise
  // name. Order does not matter; any match counts.
  aliases: ReadonlyArray<string>;
  // Substrings that disqualify a match. "Assisted pull-up" and "band
  // pull-up" are real training, but counting them toward a strict pull-up
  // best would overstate what the user can actually do.
  excludes: ReadonlyArray<string>;
  // A fixed, public progression ladder - the same numbers any coach would
  // use as checkpoints. This is a SCALE, not a ranking of the user against
  // other people, and the figure measured against it is always the user's
  // own real best set.
  ladder: ReadonlyArray<number>;
}>;

const SHARED_EXCLUSIONS: ReadonlyArray<string> = ["assisted", "band", "machine", "negative", "eccentric", "hold at"];

export const CALISTHENICS_SKILLS: ReadonlyArray<CalisthenicsSkill> = [
  { id: "pull_up", name: "Pull-up", metric: "reps", aliases: ["pull up", "pull-up", "pullup", "chin up", "chin-up", "chinup"], excludes: SHARED_EXCLUSIONS, ladder: [1, 5, 10, 15, 20] },
  { id: "dip", name: "Dip", metric: "reps", aliases: ["dip"], excludes: [...SHARED_EXCLUSIONS, "hip dip"], ladder: [1, 5, 10, 20, 30] },
  { id: "push_up", name: "Push-up", metric: "reps", aliases: ["push up", "push-up", "pushup"], excludes: [...SHARED_EXCLUSIONS, "knee"], ladder: [10, 25, 40, 60, 100] },
  { id: "muscle_up", name: "Muscle-up", metric: "reps", aliases: ["muscle up", "muscle-up", "muscleup"], excludes: SHARED_EXCLUSIONS, ladder: [1, 3, 5, 10, 15] },
  { id: "pistol_squat", name: "Pistol squat", metric: "reps", aliases: ["pistol"], excludes: SHARED_EXCLUSIONS, ladder: [1, 5, 10, 15, 20] },
  { id: "inverted_row", name: "Inverted row", metric: "reps", aliases: ["inverted row", "australian pull", "body row"], excludes: SHARED_EXCLUSIONS, ladder: [10, 20, 30, 40, 50] },
  { id: "handstand_push_up", name: "Handstand push-up", metric: "reps", aliases: ["handstand push", "hspu"], excludes: SHARED_EXCLUSIONS, ladder: [1, 3, 5, 10, 15] },
  { id: "handstand", name: "Handstand hold", metric: "hold", aliases: ["handstand"], excludes: [...SHARED_EXCLUSIONS, "push"], ladder: [10, 30, 60, 90, 120] },
  { id: "l_sit", name: "L-sit", metric: "hold", aliases: ["l sit", "l-sit", "lsit"], excludes: SHARED_EXCLUSIONS, ladder: [10, 20, 30, 45, 60] },
  { id: "front_lever", name: "Front lever", metric: "hold", aliases: ["front lever"], excludes: SHARED_EXCLUSIONS, ladder: [3, 5, 10, 15, 20] },
];

export type CalisthenicsSkillProgress = Readonly<{
  skill: CalisthenicsSkill;
  // False means "never logged", which the UI must render as an empty
  // state, never as a score of zero.
  attempted: boolean;
  best: number;
  bestAchievedAt: string | null;
  totalSets: number;
  totalVolume: number;
  sessionCount: number;
  lastPerformedAt: string | null;
  // How many ladder checkpoints the real best clears. 0 is a legitimate
  // answer for an attempted skill.
  milestonesReached: number;
  // The next checkpoint above the current best, or null once the whole
  // ladder is cleared.
  nextMilestone: number | null;
}>;

function normalizeExerciseName(name: string): string {
  return name.toLowerCase().replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

export function matchesSkill(exerciseName: string, skill: CalisthenicsSkill): boolean {
  const normalized = normalizeExerciseName(exerciseName);

  if (skill.excludes.some((exclusion) => normalized.includes(exclusion))) {
    return false;
  }

  return skill.aliases.some((alias) => normalized.includes(alias));
}

// Assisted sets are excluded at the name level above; this catches the same
// thing recorded per-set instead, via the existing BodyweightMode field.
function isQualifyingSet(set: SetLog): boolean {
  return set.bodyweightMode !== "assisted" && set.reps > 0;
}

export function getSkillProgress(sessions: ReadonlyArray<WorkoutSession>, skill: CalisthenicsSkill): CalisthenicsSkillProgress {
  let best = 0;
  let bestAchievedAt: string | null = null;
  let totalSets = 0;
  let totalVolume = 0;
  let lastPerformedAt: string | null = null;
  const sessionIds = new Set<string>();

  for (const session of sessions) {
    for (const log of session.exerciseLogs) {
      if (!matchesSkill(log.name, skill)) continue;

      const qualifying = log.sets.filter(isQualifyingSet);
      if (qualifying.length === 0) continue;

      sessionIds.add(session.id);
      totalSets += qualifying.length;

      for (const set of qualifying) {
        totalVolume += set.reps;

        if (set.reps > best) {
          best = set.reps;
          bestAchievedAt = set.completedAt;
        }
      }

      if (!lastPerformedAt || new Date(session.endedAt).getTime() > new Date(lastPerformedAt).getTime()) {
        lastPerformedAt = session.endedAt;
      }
    }
  }

  const attempted = totalSets > 0;
  const milestonesReached = attempted ? skill.ladder.filter((checkpoint) => best >= checkpoint).length : 0;
  const nextMilestone = skill.ladder.find((checkpoint) => best < checkpoint) ?? null;

  return { skill, attempted, best, bestAchievedAt, totalSets, totalVolume, sessionCount: sessionIds.size, lastPerformedAt, milestonesReached, nextMilestone };
}

export function getCalisthenicsProgress(sessions: ReadonlyArray<WorkoutSession>): CalisthenicsSkillProgress[] {
  return CALISTHENICS_SKILLS.map((skill) => getSkillProgress(sessions, skill));
}

// Attempted skills first, strongest ladder progress first within that -
// so a page shows what the user actually trains before what they have
// never touched.
export function sortProgressByRelevance(progress: ReadonlyArray<CalisthenicsSkillProgress>): CalisthenicsSkillProgress[] {
  return [...progress].sort((first, second) => {
    if (first.attempted !== second.attempted) return first.attempted ? -1 : 1;
    if (first.milestonesReached !== second.milestonesReached) return second.milestonesReached - first.milestonesReached;
    return second.totalSets - first.totalSets;
  });
}

export type CalisthenicsOverview = Readonly<{
  skillsAttempted: number;
  skillsTotal: number;
  milestonesReached: number;
  milestonesTotal: number;
}>;

// A single honest headline: how much of the ladder the user's real logs
// clear. Not a level, not a rank - a count of checkpoints actually met.
export function getCalisthenicsOverview(progress: ReadonlyArray<CalisthenicsSkillProgress>): CalisthenicsOverview {
  return {
    skillsAttempted: progress.filter((item) => item.attempted).length,
    skillsTotal: progress.length,
    milestonesReached: progress.reduce((sum, item) => sum + item.milestonesReached, 0),
    milestonesTotal: progress.reduce((sum, item) => sum + item.skill.ladder.length, 0),
  };
}
