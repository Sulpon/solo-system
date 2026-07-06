import { categories as legacyDefaultCategories } from "./mock/categories";
import type { Category } from "./types/category";
import type { GoalTree } from "./types/goal-tree";
import type { Quest } from "./types/quest";

export const MIN_ONBOARDING_ATTRIBUTES = 3;
export const MAX_ONBOARDING_ATTRIBUTES = 7;

export const ONBOARDING_ATTRIBUTE_PRESETS: ReadonlyArray<Category> = [
  { id: "trading", name: "Trading", icon: "T", accent: "bg-emerald-400", description: "Master markets through discipline." },
  { id: "career", name: "Career", icon: "C", accent: "bg-cyan-400", description: "Build meaningful work." },
  { id: "physical-health", name: "Physical Health", icon: "H", accent: "bg-rose-400", description: "Strength and endurance." },
  { id: "discipline", name: "Discipline", icon: "D", accent: "bg-purple-500", description: "Consistency above motivation." },
  { id: "self-development", name: "Self Development", icon: "S", accent: "bg-amber-400", description: "Become wiser every day." },
  { id: "finance", name: "Finance", icon: "$", accent: "bg-lime-400", description: "Grow and protect your resources." },
  { id: "relationships", name: "Relationships", icon: "R", accent: "bg-pink-400", description: "Deepen trust and connection." },
  { id: "learning", name: "Learning", icon: "L", accent: "bg-sky-400", description: "Turn curiosity into mastery." },
  { id: "creativity", name: "Creativity", icon: "✦", accent: "bg-fuchsia-400", description: "Turn imagination into work." },
  { id: "business", name: "Business", icon: "B", accent: "bg-orange-400", description: "Build something that lasts." },
];

export const ONBOARDING_QUOTES: ReadonlyArray<string> = [
  "Every dream begins with a single decision.",
  "The life you build starts here.",
  "Today's choices become tomorrow's identity.",
  "Discipline is the bridge between dream and reality.",
  "Small steps, repeated daily, become a legend.",
];

export function pickRandomQuote() {
  return ONBOARDING_QUOTES[Math.floor(Math.random() * ONBOARDING_QUOTES.length)];
}

export const ONBOARDING_COLOR_OPTIONS: ReadonlyArray<Readonly<{ label: string; value: string }>> = [
  { label: "Purple", value: "bg-purple-500" },
  { label: "Cyan", value: "bg-cyan-400" },
  { label: "Emerald", value: "bg-emerald-400" },
  { label: "Rose", value: "bg-rose-400" },
  { label: "Amber", value: "bg-amber-400" },
  { label: "Fuchsia", value: "bg-fuchsia-400" },
  { label: "Orange", value: "bg-orange-400" },
  { label: "Sky", value: "bg-sky-400" },
  { label: "Lime", value: "bg-lime-400" },
  { label: "Pink", value: "bg-pink-400" },
];

export function slugifyAttributeName(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "attribute";
}

export function generateAttributeId(name: string, existingIds: ReadonlyArray<string>) {
  const base = slugifyAttributeName(name);

  if (!existingIds.includes(base)) {
    return base;
  }

  let suffix = 2;

  while (existingIds.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

export function hasLegacyAtlasData(goalTree: GoalTree, quests: ReadonlyArray<Quest>, attributes: ReadonlyArray<Category>) {
  return attributes.length > 0 || goalTree.length > 0 || quests.length > 0;
}

export function getLegacyDefaultAttributes(): Category[] {
  return legacyDefaultCategories.map((category) => ({ ...category }));
}

export function hasDreamNode(goalTree: GoalTree) {
  return goalTree.some((node) => node.type === "dream");
}
