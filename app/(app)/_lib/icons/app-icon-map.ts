import {
  BookOpen,
  Bot,
  Briefcase,
  CalendarDays,
  ClipboardList,
  Dumbbell,
  GraduationCap,
  Globe2,
  LayoutDashboard,
  Library,
  ListChecks,
  NotebookPen,
  Settings,
  ShoppingBag,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { useAttributes } from "../hooks/useAttributes";

export type AppNavItem = Readonly<{
  key: string;
  name: string;
  href: string;
  icon: LucideIcon;
  // Whether this app appears in the Dock's default pinned set.
  pinned?: boolean;
}>;

// Single source of truth for every real Atlas route, consumed by Sidebar
// (mobile drawer), Dock, and the Launcher alike - previously each of these
// would have needed its own hardcoded list (Sidebar already had one, which
// this replaces). Includes career-hub/thesis-hub/workouts, which existed as
// real routes but were missing from Sidebar's old list entirely.
const staticNavItems: readonly AppNavItem[] = [
  { key: "dashboard", name: "Mission Control", href: "/", icon: LayoutDashboard, pinned: true },
  { key: "jarvis", name: "JARVIS", href: "/jarvis", icon: Bot, pinned: true },
  { key: "quests", name: "Quests", href: "/quests", icon: ListChecks, pinned: true },
  { key: "calendar", name: "Calendar", href: "/calendar", icon: CalendarDays },
  { key: "challenges", name: "Challenges", href: "/challenges", icon: Trophy },
  { key: "goals", name: "Goal Tree", href: "/goals", icon: Target, pinned: true },
  { key: "planning", name: "Planning", href: "/planning", icon: ClipboardList },
  { key: "rewards", name: "Rewards", href: "/rewards", icon: ShoppingBag },
  { key: "character", name: "Character", href: "/character", icon: UserRound, pinned: true },
  { key: "world-map", name: "World Map", href: "/world-map", icon: Globe2 },
  { key: "chronicle", name: "Chronicle", href: "/chronicle", icon: BookOpen },
  { key: "notes", name: "Notes", href: "/notes", icon: NotebookPen },
  { key: "library", name: "Library", href: "/library", icon: Library },
  { key: "career-hub", name: "Career Hub", href: "/career-hub", icon: Briefcase },
  { key: "thesis-hub", name: "Thesis Hub", href: "/thesis-hub", icon: GraduationCap },
  { key: "workouts", name: "Workouts", href: "/workouts", icon: Dumbbell },
];

const trailingNavItems: readonly AppNavItem[] = [{ key: "settings", name: "Settings", href: "/settings", icon: Settings }];

// Attributes (Skills) are per-user/dynamic, so they're merged in here rather
// than baked into the static list - matches exactly what Sidebar.tsx already
// did with useAttributes() before this map existed, just centralized to one
// place instead of duplicated at every nav surface.
export function useAppNavItems(): AppNavItem[] {
  const { attributes } = useAttributes();

  const attributeNavItems: AppNavItem[] = attributes.map((attribute) => ({
    key: `attribute:${attribute.id}`,
    name: attribute.name,
    href: `/attributes/${attribute.id}`,
    icon: Sparkles,
  }));

  return [...staticNavItems, ...attributeNavItems, ...trailingNavItems];
}

export function usePinnedAppNavItems(): AppNavItem[] {
  return useAppNavItems().filter((item) => item.pinned);
}

// Shared active-route predicate - exactly what Sidebar.tsx already used,
// now reused by Dock too instead of being redefined.
export function isNavItemActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}
