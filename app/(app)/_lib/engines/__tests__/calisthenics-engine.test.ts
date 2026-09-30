import { describe, expect, it } from "vitest";
import { CALISTHENICS_SKILLS, getCalisthenicsOverview, getCalisthenicsProgress, getSkillProgress, matchesSkill, sortProgressByRelevance } from "../calisthenics-engine";
import type { ExerciseLog, SetLog, WorkoutSession } from "../../types/workout";

function set(reps: number, overrides: Partial<SetLog> = {}): SetLog {
  return { id: `set-${reps}-${Math.random()}`, setNumber: 1, weight: 0, reps, unit: "bodyweight", completedAt: "2026-09-18T10:00:00.000Z", ...overrides };
}

function log(name: string, sets: SetLog[]): ExerciseLog {
  return { id: `log-${name}`, name, unit: "bodyweight", sets, order: 0 };
}

function session(id: string, logs: ExerciseLog[], endedAt = "2026-09-18T11:00:00.000Z"): WorkoutSession {
  return { id, startedAt: "2026-09-18T10:00:00.000Z", endedAt, durationSeconds: 3600, exerciseLogs: logs, totalVolume: 0, personalRecordsAchieved: [] };
}

const pullUp = CALISTHENICS_SKILLS.find((skill) => skill.id === "pull_up")!;
const dip = CALISTHENICS_SKILLS.find((skill) => skill.id === "dip")!;
const handstand = CALISTHENICS_SKILLS.find((skill) => skill.id === "handstand")!;

describe("matchesSkill", () => {
  it("matches the common spellings people actually type", () => {
    for (const name of ["Pull Up", "pull-up", "Pullups", "Chin-up", "WEIGHTED PULL UP"]) {
      expect(matchesSkill(name, pullUp)).toBe(true);
    }
  });

  it("does not count assisted or banded variants toward a strict best", () => {
    expect(matchesSkill("Assisted pull-up", pullUp)).toBe(false);
    expect(matchesSkill("Band pull-up", pullUp)).toBe(false);
    expect(matchesSkill("Pull-up negative", pullUp)).toBe(false);
  });

  it("does not confuse two different skills that share a word", () => {
    expect(matchesSkill("Handstand push-up", handstand)).toBe(false);
    expect(matchesSkill("Hip dip", dip)).toBe(false);
  });

  it("ignores an unrelated exercise", () => {
    expect(matchesSkill("Barbell bench press", pullUp)).toBe(false);
  });
});

describe("getSkillProgress", () => {
  it("reports a skill that was never logged as unattempted, not as a zero score", () => {
    const progress = getSkillProgress([session("s1", [log("Bench press", [set(10)])])], pullUp);

    expect(progress.attempted).toBe(false);
    expect(progress.best).toBe(0);
    expect(progress.milestonesReached).toBe(0);
    expect(progress.lastPerformedAt).toBeNull();
  });

  it("takes the best single real set, not a total or an average", () => {
    const progress = getSkillProgress([session("s1", [log("Pull-up", [set(6), set(11), set(8)])])], pullUp);

    expect(progress.best).toBe(11);
    expect(progress.totalSets).toBe(3);
    expect(progress.totalVolume).toBe(25);
  });

  it("ignores assisted sets even when the exercise name is clean", () => {
    const progress = getSkillProgress([session("s1", [log("Pull-up", [set(5), set(20, { bodyweightMode: "assisted" })])])], pullUp);

    expect(progress.best).toBe(5);
    expect(progress.totalSets).toBe(1);
  });

  it("counts distinct sessions rather than logs", () => {
    const progress = getSkillProgress([session("s1", [log("Pull-up", [set(5)]), log("Weighted pull-up", [set(3)])]), session("s2", [log("Pull-up", [set(7)])])], pullUp);

    expect(progress.sessionCount).toBe(2);
    expect(progress.best).toBe(7);
  });

  it("tracks the most recent day the skill was trained", () => {
    const progress = getSkillProgress(
      [session("s1", [log("Pull-up", [set(5)])], "2026-09-10T11:00:00.000Z"), session("s2", [log("Pull-up", [set(4)])], "2026-09-17T11:00:00.000Z")],
      pullUp,
    );

    expect(progress.lastPerformedAt).toBe("2026-09-17T11:00:00.000Z");
  });

  it("counts only the ladder checkpoints the real best actually clears", () => {
    // Pull-up ladder is 1/5/10/15/20.
    const progress = getSkillProgress([session("s1", [log("Pull-up", [set(11)])])], pullUp);

    expect(progress.milestonesReached).toBe(3);
    expect(progress.nextMilestone).toBe(15);
  });

  it("reports no next checkpoint once the whole ladder is cleared", () => {
    expect(getSkillProgress([session("s1", [log("Pull-up", [set(25)])])], pullUp).nextMilestone).toBeNull();
  });

  it("records a hold's logged value without converting or interpreting it", () => {
    const progress = getSkillProgress([session("s1", [log("Handstand", [set(45)])])], handstand);

    expect(progress.best).toBe(45);
    expect(progress.skill.metric).toBe("hold");
  });
});

describe("getCalisthenicsProgress / overview", () => {
  it("returns one entry per known skill, attempted or not", () => {
    expect(getCalisthenicsProgress([])).toHaveLength(CALISTHENICS_SKILLS.length);
  });

  it("reports an entirely empty history honestly", () => {
    const overview = getCalisthenicsOverview(getCalisthenicsProgress([]));

    expect(overview.skillsAttempted).toBe(0);
    expect(overview.milestonesReached).toBe(0);
    expect(overview.skillsTotal).toBe(CALISTHENICS_SKILLS.length);
  });

  it("counts only real attempts and real checkpoints", () => {
    const overview = getCalisthenicsOverview(getCalisthenicsProgress([session("s1", [log("Pull-up", [set(11)]), log("Dip", [set(5)])])]));

    expect(overview.skillsAttempted).toBe(2);
    // Pull-up clears 1/5/10 (3), Dip clears 1/5 (2).
    expect(overview.milestonesReached).toBe(5);
  });

  it("puts trained skills ahead of untouched ones", () => {
    const sorted = sortProgressByRelevance(getCalisthenicsProgress([session("s1", [log("Dip", [set(12)])])]));

    expect(sorted[0].skill.id).toBe("dip");
    expect(sorted[sorted.length - 1].attempted).toBe(false);
  });
});
