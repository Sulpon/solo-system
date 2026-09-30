"use client";

import Link from "next/link";

// The one place that explains how /goals and /planning differ.
//
// Both read and write the SAME GoalNode tree through the same
// planning-engine traversals and the same useGoalTree mutations - there is
// no duplicated logic and no second store. What differs is the question
// each page answers:
//
//   Goal Tree  "how does my year connect down to today?"  - the whole
//              Year -> Quarter -> Month -> Week -> Quest chain at once,
//              for navigating and understanding structure.
//   Planning   "what am I committing to this quarter?"    - one quarter at
//              a time, across every dream, for deciding and scheduling.
//
// Without this link the two pages looked like duplicates; with it each one
// names the other's job, so it is clear which to open.

type PlanningCrossLinkProps = Readonly<{
  // Which page is rendering the link - it always points at the OTHER one.
  from: "goal-tree" | "planning";
}>;

const COPY = {
  "goal-tree": {
    href: "/planning",
    label: "Open Planning",
    text: "Planning works one quarter at a time across every annual goal — use it to decide and schedule what a quarter commits to.",
  },
  planning: {
    href: "/goals",
    label: "Open Goal Tree",
    text: "The Goal Tree shows the whole chain from year down to today's quests — use it to see how this quarter connects to everything else.",
  },
} as const;

export default function PlanningCrossLink({ from }: PlanningCrossLinkProps) {
  const { href, label, text } = COPY[from];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3">
      <p className="atlas-muted min-w-0 text-xs">{text}</p>
      <Link href={href} className="atlas-accent shrink-0 rounded-lg border border-[rgb(var(--atlas-accent,168_85_247)/0.4)] px-3 py-1.5 text-xs font-semibold transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.12)]">
        {label} →
      </Link>
    </div>
  );
}
