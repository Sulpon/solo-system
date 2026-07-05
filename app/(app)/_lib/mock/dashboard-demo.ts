export type TimeDistributionSlice = Readonly<{ label: string; value: number; accent: string }>;
export type MotivationBannerData = Readonly<{ quote: string; phrase: string; emblem: string }>;

export const dashboardDemoMetrics: Readonly<{
  focusTimeToday: string;
  focusTimeDelta: string;
  activeQuestDelta: string;
  streakDelta: string;
  xpDelta: string;
  dreamDelta: string;
  questSparkline: number[];
  streakSparkline: number[];
}> = {
  focusTimeToday: "9h 15m",
  focusTimeDelta: "+1h 20m vs yesterday",
  activeQuestDelta: "+3 vs last check-in",
  streakDelta: "+2 days",
  xpDelta: "+18% this week",
  dreamDelta: "+11% average",
  questSparkline: [18, 22, 19, 27, 24, 31, 26],
  streakSparkline: [2, 3, 2, 4, 5, 6, 7],
};

export const dashboardTimeDistribution: TimeDistributionSlice[] = [
  { label: "Trading", value: 34, accent: "from-emerald-400 to-cyan-400" },
  { label: "Study", value: 28, accent: "from-purple-400 to-fuchsia-400" },
  { label: "Workout", value: 17, accent: "from-rose-400 to-orange-400" },
  { label: "Relax", value: 14, accent: "from-cyan-400 to-blue-400" },
  { label: "Other", value: 7, accent: "from-slate-500 to-slate-400" },
];

export const dashboardMotivationBanner: MotivationBannerData = {
  quote: "The system rewards consistency before intensity.",
  phrase: "Keep feeding the loop.",
  emblem: "MENACE",
};

export const dashboardDemoDreams = [
  {
    id: "demo-dream-1",
    title: "Become Trader",
    subtitle: "Capital, process, and execution",
    progress: 72,
  },
  {
    id: "demo-dream-2",
    title: "Process Engineer",
    subtitle: "Research, systems, and leverage",
    progress: 58,
  },
  {
    id: "demo-dream-3",
    title: "Exceptional Physique",
    subtitle: "Strength, conditioning, recovery",
    progress: 63,
  },
  {
    id: "demo-dream-4",
    title: "Self Development",
    subtitle: "Reading, writing, language",
    progress: 51,
  },
];

export const dashboardDemoMilestones = [
  {
    title: "500 Backtests Completed",
    subtitle: "System review completed",
    date: "May 17, 2024",
    accent: "text-purple-300",
  },
  {
    title: "First 30-Day Streak",
    subtitle: "Habit loop stabilized",
    date: "May 09, 2024",
    accent: "text-cyan-300",
  },
  {
    title: "Thesis Milestone",
    subtitle: "Research block shipped",
    date: "May 03, 2024",
    accent: "text-emerald-300",
  },
];
