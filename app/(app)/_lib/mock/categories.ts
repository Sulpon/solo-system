import type { Category } from "../types/category";

export const categories: Category[] = [
  {
    id: "discipline",
    name: "Discipline",
    icon: "D",
    accent: "bg-purple-500",
    description: "Habits, consistency, and execution discipline.",
  },
  {
    id: "career",
    name: "Career",
    icon: "C",
    accent: "bg-cyan-400",
    description: "Thesis, work, research, and professional leverage.",
  },
  {
    id: "trading",
    name: "Trading",
    icon: "T",
    accent: "bg-emerald-400",
    description: "Backtesting, models, execution, and journaling.",
  },
  {
    id: "physical-health",
    name: "Physical Health",
    icon: "H",
    accent: "bg-rose-400",
    description: "Training, recovery, nutrition, and energy.",
  },
  {
    id: "self-development",
    name: "Self Development",
    icon: "S",
    accent: "bg-amber-400",
    description: "Learning, writing, reading, language, and memory.",
  },
];
