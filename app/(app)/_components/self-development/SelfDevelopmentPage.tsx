"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Card from "../Card";
import StatCard from "../StatCard";
import PageHeader from "../PageHeader";
import AttributeListCard from "../AttributeListCard";
import AttributeActivityCard from "../AttributeActivityCard";
import CustomizablePage from "../page-edit/CustomizablePage";
import PRTimeline from "../workouts/PRTimeline";
import SessionHistoryList from "../workouts/SessionHistoryList";
import SessionDetailModal from "../workouts/SessionDetailModal";
import WorkoutCalendar from "./WorkoutCalendar";
import ExerciseProgressPanel from "./ExerciseProgressPanel";
import { getCatalogWidgetsForPage } from "../../_lib/widgets/catalog-registry";
import { getAttributePortfolio } from "../../_lib/attribute-portfolio";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useCategoryProgression } from "../../_lib/hooks/use-category-progression";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useWorkoutSessions } from "../../_lib/hooks/useWorkoutSessions";
import { getDaysSinceLastWorkout, getLifetimeTrainingSeconds, getPersonalRecords, getTrainingFrequency, getWorkoutStreak } from "../../_lib/engines/workout-engine";
import { formatFocusMinutesLabel } from "../focus/focus-format";
import type { EditablePageSection } from "../page-edit/types";
import type { WorkoutSession } from "../../_lib/types/workout";

const SELF_DEVELOPMENT_ATTRIBUTE_ID = "self-development";

export default function SelfDevelopmentPage() {
  const { attributes, hasLoaded: hasLoadedAttributes } = useAttributes();
  const { isReady, progression } = useCategoryProgression(SELF_DEVELOPMENT_ATTRIBUTE_ID);
  const { goalTree } = useGoalTree();
  const { questDefinitions, activityEvents } = useProgression();
  const { sessions } = useWorkoutSessions();
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);

  const attribute = attributes.find((item) => item.id === SELF_DEVELOPMENT_ATTRIBUTE_ID);
  const displayName = attribute?.name ?? progression?.name ?? "Self Development";
  const categoryProgress = progression ?? null;

  const portfolio = useMemo(() => getAttributePortfolio(goalTree, questDefinitions, SELF_DEVELOPMENT_ATTRIBUTE_ID), [goalTree, questDefinitions]);
  const availableWidgets = useMemo(() => getCatalogWidgetsForPage(SELF_DEVELOPMENT_ATTRIBUTE_ID), []);
  const personalRecords = useMemo(() => getPersonalRecords(sessions), [sessions]);

  const workoutsThisWeek = getTrainingFrequency(sessions, 7);
  const workoutsThisMonth = getTrainingFrequency(sessions, 30);
  const currentStreak = getWorkoutStreak(sessions);
  const lifetimeTrainingSeconds = getLifetimeTrainingSeconds(sessions);
  const daysSinceLastWorkout = getDaysSinceLastWorkout(sessions);
  const latestWorkoutLabel = daysSinceLastWorkout === null ? "No workouts yet" : daysSinceLastWorkout === 0 ? "Today" : `${daysSinceLastWorkout}d ago`;

  const summary =
    sessions.length === 0
      ? "Log your first workout to start tracking physical progress here."
      : `${workoutsThisMonth} workout${workoutsThisMonth === 1 ? "" : "s"} this month · ${currentStreak}-day streak · last trained ${latestWorkoutLabel.toLowerCase()}.`;

  const sections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "self-development-header",
        title: "Header",
        size: "xl",
        content: (
          <div className="space-y-3">
            <PageHeader
              title={displayName}
              level={isReady ? categoryProgress?.level ?? 1 : 1}
              xp={isReady ? categoryProgress?.xp ?? 0 : 0}
              maxXp={isReady ? categoryProgress?.xpNeededForNextLevel ?? 1 : 1}
              accentClass="text-amber-300"
            />
            <p className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">{summary}</p>
          </div>
        ),
      },
      {
        id: "self-development-open-workouts",
        title: "Open Workout Manager",
        size: "sm",
        content: (
          <Link href="/workouts" className="block h-full">
            <Card className="flex h-full flex-col p-5">
              <div className="flex items-center justify-between">
                <span className="text-3xl">🏋</span>
                <span className="text-slate-500">→</span>
              </div>
              <h2 className="mt-4 text-lg font-black text-white">Workouts</h2>
              <p className="mt-2 flex-1 text-sm text-slate-400">Log sessions, manage templates, and track bodyweight. Workout history feeds every stat on this page.</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">{sessions.length} session{sessions.length === 1 ? "" : "s"} logged</p>
            </Card>
          </Link>
        ),
      },
      {
        id: "self-development-overview",
        title: "Workout Overview",
        size: "lg",
        content: (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="This Week" value={workoutsThisWeek} accentClass="text-emerald-300" />
            <StatCard label="This Month" value={workoutsThisMonth} accentClass="text-emerald-300" />
            <StatCard label="Current Streak" value={`${currentStreak}d`} accentClass="text-emerald-300" />
            <StatCard label="Total Training Time" value={formatFocusMinutesLabel(lifetimeTrainingSeconds / 60)} accentClass="text-emerald-300" />
          </div>
        ),
      },
      {
        id: "self-development-calendar",
        title: "Workout Calendar",
        size: "xl",
        content: (
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Workout Calendar</p>
            <h2 className="mt-2 text-xl font-black text-white">Training activity</h2>
            <div className="mt-5">
              <WorkoutCalendar sessions={sessions} />
            </div>
          </Card>
        ),
      },
      {
        id: "self-development-exercise-progress",
        title: "Exercise Progress",
        size: "xl",
        content: (
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Exercise Progress</p>
            <h2 className="mt-2 text-xl font-black text-white">Track a lift over time</h2>
            <div className="mt-5">
              <ExerciseProgressPanel sessions={sessions} />
            </div>
          </Card>
        ),
      },
      {
        id: "self-development-personal-records",
        title: "Personal Records",
        size: "lg",
        content: (
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">Personal Records</p>
            <h2 className="mt-2 text-xl font-black text-white">Recent PRs</h2>
            <div className="mt-5">
              <PRTimeline records={personalRecords.slice(0, 10)} emptyText="Log workouts to start tracking personal records." />
            </div>
          </Card>
        ),
      },
      {
        id: "self-development-recent-workouts",
        title: "Recent Workouts",
        size: "lg",
        content: (
          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Recent Workouts</p>
            <h2 className="mt-2 text-xl font-black text-white">Session history</h2>
            <div className="mt-5">
              <SessionHistoryList sessions={sessions} onSelect={setSelectedSession} />
            </div>
          </Card>
        ),
      },
      {
        id: "self-development-dreams",
        title: "Dreams",
        size: "lg",
        content: (
          <AttributeListCard
            title="Dreams"
            accentClass="text-amber-300"
            items={portfolio.dreams.map((dream) => ({ id: dream.id, title: dream.title, subtitle: dream.description ?? dream.type.replaceAll("_", " "), progress: dream.progress }))}
            emptyTitle="No self-development dreams yet"
            emptyDescription="Create a Dream with Self Development attached to see it appear here."
          />
        ),
      },
      {
        id: "self-development-goals",
        title: "Goals",
        size: "lg",
        content: (
          <AttributeListCard
            title="Goals"
            accentClass="text-cyan-300"
            items={portfolio.goals.map((goal) => ({ id: goal.id, title: goal.title, subtitle: goal.description ?? goal.type.replaceAll("_", " "), progress: goal.progress }))}
            emptyTitle="No self-development goals yet"
            emptyDescription="Self Development goals inherited from a Dream will appear automatically."
          />
        ),
      },
      {
        id: "self-development-milestones",
        title: "Milestones",
        size: "lg",
        content: (
          <AttributeListCard
            title="Milestones"
            accentClass="text-amber-300"
            items={portfolio.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, subtitle: milestone.description ?? milestone.type.replaceAll("_", " "), progress: milestone.progress }))}
            emptyTitle="No self-development milestones yet"
            emptyDescription="Milestones tied to the Self Development branch will show up here."
          />
        ),
      },
      {
        id: "self-development-progress-goals",
        title: "Progress Goals",
        size: "lg",
        content: (
          <AttributeListCard
            title="Progress Goals"
            accentClass="text-orange-300"
            items={portfolio.progressGoals.map((goal) => ({
              id: goal.id,
              title: goal.title,
              subtitle: goal.unit ? `${goal.currentValue ?? 0} / ${goal.targetValue ?? 0} ${goal.unit}` : goal.description ?? "Progress goal",
              progress: goal.progress,
            }))}
            emptyTitle="No self-development progress goals yet"
            emptyDescription="Progress goals under the Self Development dream will appear here."
          />
        ),
      },
      {
        id: "self-development-quests",
        title: "Quests",
        size: "lg",
        content: (
          <AttributeListCard
            title="Quests"
            accentClass="text-purple-300"
            items={portfolio.quests.map((quest) => ({ id: quest.id, title: quest.title, subtitle: quest.description ?? "Quest" }))}
            emptyTitle="No self-development quests yet"
            emptyDescription="Quests linked to Self Development goals will appear automatically."
          />
        ),
      },
      {
        id: "self-development-activity",
        title: "Recent Activity",
        size: "lg",
        content: <AttributeActivityCard categoryId={SELF_DEVELOPMENT_ATTRIBUTE_ID} accentClass="text-amber-300" events={activityEvents} />,
      },
    ],
    [
      activityEvents,
      categoryProgress?.level,
      categoryProgress?.xp,
      categoryProgress?.xpNeededForNextLevel,
      currentStreak,
      displayName,
      isReady,
      lifetimeTrainingSeconds,
      personalRecords,
      portfolio,
      sessions,
      summary,
      workoutsThisMonth,
      workoutsThisWeek,
    ],
  );

  if (!isReady || !hasLoadedAttributes) {
    return <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-sm text-slate-400">Loading self-development progression...</div>;
  }

  return (
    <>
      <CustomizablePage
        pageId={SELF_DEVELOPMENT_ATTRIBUTE_ID}
        title={displayName}
        subtitle="Your physical performance over time, sourced from Workout History."
        sections={sections}
        availableWidgets={availableWidgets}
      />
      {selectedSession ? <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} /> : null}
    </>
  );
}
