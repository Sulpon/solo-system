import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import CalisthenicsProgression from "../CalisthenicsProgression";
import HallOfFame from "../HallOfFame";
import type { ExerciseLog, PersonalRecordEvent, SetLog, WorkoutSession } from "../../../_lib/types/workout";

function set(reps: number): SetLog {
  return { id: `set-${reps}`, setNumber: 1, weight: 0, reps, unit: "bodyweight", completedAt: "2026-09-18T10:00:00.000Z" };
}

function log(name: string, sets: SetLog[]): ExerciseLog {
  return { id: `log-${name}`, name, unit: "bodyweight", sets, order: 0 };
}

function session(logs: ExerciseLog[], records: PersonalRecordEvent[] = []): WorkoutSession {
  return {
    id: "session-1",
    startedAt: "2026-09-18T10:00:00.000Z",
    endedAt: "2026-09-18T11:00:00.000Z",
    durationSeconds: 3600,
    exerciseLogs: logs,
    totalVolume: 0,
    personalRecordsAchieved: records,
  };
}

describe("CalisthenicsProgression", () => {
  it("shows an honest empty state rather than a board of zeros when nothing is logged", () => {
    render(<CalisthenicsProgression sessions={[]} />);

    expect(screen.getByTestId("calisthenics-empty")).toBeTruthy();
    expect(screen.queryByText("Pull-up")).toBeNull();
  });

  it("does not treat unrelated training as calisthenics progress", () => {
    render(<CalisthenicsProgression sessions={[session([log("Barbell bench press", [set(8)])])]} />);

    expect(screen.getByTestId("calisthenics-empty")).toBeTruthy();
  });

  it("shows the real best set for a trained skill", () => {
    render(<CalisthenicsProgression sessions={[session([log("Pull-up", [set(6), set(11)])])]} />);

    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText(/Next: 15/)).toBeTruthy();
  });

  it("labels an untrained skill as not logged instead of showing a zero score", () => {
    render(<CalisthenicsProgression sessions={[session([log("Pull-up", [set(11)])])]} />);

    // Muscle-up was never performed, so its row must say so explicitly.
    expect(screen.getAllByText("Not logged yet").length).toBeGreaterThan(0);
  });

  it("reports how much of the ladder real logs actually clear", () => {
    render(<CalisthenicsProgression sessions={[session([log("Pull-up", [set(11)])])]} />);

    expect(screen.getByText(/1 of \d+ skills trained/)).toBeTruthy();
    expect(screen.getByText(/3 of \d+ checkpoints cleared/)).toBeTruthy();
  });
});

describe("HallOfFame", () => {
  it("shows an empty state when no records have been set, and never invents opponents", () => {
    render(<HallOfFame sessions={[session([log("Pull-up", [set(5)])])]} />);

    const empty = screen.getByTestId("hall-of-fame-empty");

    expect(within(empty).getByText("No personal records yet")).toBeTruthy();
    expect(screen.queryByText(/rank/i)).toBeNull();
    expect(screen.queryByText(/leaderboard/i)).toBeNull();
  });

  it("renders only records that really exist on finished sessions", () => {
    const record: PersonalRecordEvent = {
      id: "pr-1",
      type: "max_reps",
      exerciseName: "Pull-up",
      value: 11,
      sessionId: "session-1",
      achievedAt: "2026-09-18T10:30:00.000Z",
    };

    render(<HallOfFame sessions={[session([log("Pull-up", [set(11)])], [record])]} />);

    expect(screen.getByText("Max reps")).toBeTruthy();
    expect(screen.getByText("11")).toBeTruthy();
    expect(screen.getByText(/1 record set against your own previous bests/)).toBeTruthy();
  });
});
