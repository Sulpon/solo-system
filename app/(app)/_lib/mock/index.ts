import { defaultAppearanceSettings } from "./customization";
import { categories } from "./categories";
import { characterProfile, dashboardHero } from "./character";
import { dashboardGridLayout, dashboardLayout } from "./dashboard-layout";
import { mainQuest } from "./main-quest";
import { dailyQuests, editableQuests, quests } from "./quests";
import { achievements, recentAchievement } from "./achievements";

export { achievements, categories, characterProfile, dailyQuests, dashboardHero, dashboardGridLayout, dashboardLayout, editableQuests, mainQuest, quests, recentAchievement, defaultAppearanceSettings };

export const navItems = [
  { name: "Dashboard", href: "/" },
  { name: "Quests", href: "/quests" },
  { name: "Goal Tree", href: "/goals" },
  { name: "Discipline", href: "/discipline" },
  { name: "Career", href: "/career" },
  { name: "Trading", href: "/trading" },
  { name: "Physical Health", href: "/physical-health" },
  { name: "Self-Development", href: "/self-development" },
  { name: "Settings", href: "/settings" },
];
