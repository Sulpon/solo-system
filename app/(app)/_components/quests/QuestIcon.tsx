import type { ConsistencyBadgeIcon } from "../../_lib/engines/quest-visual-engine";

export type QuestIconKey =
  | "briefcase"
  | "chart"
  | "snowflake"
  | "brain"
  | "book"
  | "dumbbell"
  | "leaf"
  | "moon"
  | "droplet"
  | "phone-off"
  | "code"
  | "pencil"
  | "heart"
  | "music"
  | "palette"
  | "graduation-cap"
  | "footprints"
  | "sun"
  | "scroll";

const KEYWORD_MAP: ReadonlyArray<{ keywords: ReadonlyArray<string>; icon: QuestIconKey }> = [
  { keywords: ["job", "apply", "application", "career", "interview", "resume", "cv"], icon: "briefcase" },
  { keywords: ["trade", "trading", "backtest", "market", "invest", "stock"], icon: "chart" },
  { keywords: ["cold", "shower", "ice bath"], icon: "snowflake" },
  { keywords: ["deep work", "focus", "study", "think", "plan"], icon: "brain" },
  { keywords: ["journal", "diary", "thesis", "manuscript", "research"], icon: "book" },
  { keywords: ["leg", "gym", "workout", "lift", "training", "exercise", "cardio", "push", "pull"], icon: "dumbbell" },
  { keywords: ["meditate", "meditation", "mindful", "breath", "yoga"], icon: "leaf" },
  { keywords: ["sleep", "bed", "rest", "nap"], icon: "moon" },
  { keywords: ["water", "hydrate", "drink"], icon: "droplet" },
  { keywords: ["instagram", "social media", "phone", "screen time", "scroll"], icon: "phone-off" },
  { keywords: ["code", "coding", "program", "dev", "build"], icon: "code" },
  { keywords: ["write", "writing", "read", "reading"], icon: "pencil" },
  { keywords: ["health", "diet", "nutrition", "eat", "meal"], icon: "heart" },
  { keywords: ["music", "practice", "instrument", "guitar", "piano"], icon: "music" },
  { keywords: ["art", "draw", "paint", "creative", "design"], icon: "palette" },
  { keywords: ["learn", "course", "class", "lesson"], icon: "graduation-cap" },
  { keywords: ["walk", "steps", "hike", "run"], icon: "footprints" },
  { keywords: ["morning", "wake", "routine", "sunrise"], icon: "sun" },
];

export function getQuestIconKey(title: string): QuestIconKey {
  const normalized = title.toLowerCase();

  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.icon;
    }
  }

  return "scroll";
}

const ICON_PATHS: Record<QuestIconKey, React.ReactNode> = {
  briefcase: (
    <>
      <rect x="3" y="7" width="14" height="10" rx="1.5" />
      <path d="M7 7V5.5A1.5 1.5 0 0 1 8.5 4h3A1.5 1.5 0 0 1 13 5.5V7" />
      <path d="M3 11h14" />
    </>
  ),
  chart: (
    <>
      <path d="M3 17V9M9 17V5M15 17v-6" />
      <path d="M3 8l4-3 4 2 6-4" />
    </>
  ),
  snowflake: (
    <>
      <path d="M10 2v16M3.2 6l13.6 8M3.2 14l13.6-8" />
    </>
  ),
  brain: (
    <>
      <path d="M8 4a3 3 0 0 0-3 3 2.5 2.5 0 0 0-1 4.7A2.5 2.5 0 0 0 6.5 16h1a2.5 2.5 0 0 0 2.5-2.5v-6A3.5 3.5 0 0 0 8 4Z" />
      <path d="M12 4a3 3 0 0 1 3 3 2.5 2.5 0 0 1 1 4.7A2.5 2.5 0 0 1 13.5 16h-1a2.5 2.5 0 0 1-2.5-2.5v-6A3.5 3.5 0 0 1 12 4Z" />
    </>
  ),
  book: (
    <>
      <path d="M10 6.5C9 5.5 6.5 5 3.5 5.4V15c3-.4 5.5.1 6.5 1.1 1-1 3.5-1.5 6.5-1.1V5.4C13.5 5 11 5.5 10 6.5Z" />
      <path d="M10 6.5V16" />
    </>
  ),
  dumbbell: (
    <>
      <path d="M4 10h12" />
      <rect x="2" y="8" width="2.4" height="4" rx="0.8" />
      <rect x="15.6" y="8" width="2.4" height="4" rx="0.8" />
      <rect x="5.5" y="6.5" width="1.8" height="7" rx="0.8" />
      <rect x="12.7" y="6.5" width="1.8" height="7" rx="0.8" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 16c-.6-6 3-11 12-12 .6 8-3.5 12-9 12-1 0-2.2-.1-3-.4Z" />
      <path d="M6 16C9 12 12 9 16 4" />
    </>
  ),
  moon: <path d="M15 11.5A6.5 6.5 0 0 1 8.5 5 6.5 6.5 0 1 0 15 11.5Z" />,
  droplet: <path d="M10 3c3 4 5.5 7 5.5 9.6A5.5 5.5 0 1 1 4.5 12.6C4.5 10 7 7 10 3Z" />,
  "phone-off": (
    <>
      <rect x="6" y="2.5" width="8" height="15" rx="1.6" />
      <path d="M3 3l14 14" />
    </>
  ),
  code: <path d="M7 6 3 10l4 4M13 6l4 4-4 4" />,
  pencil: (
    <>
      <path d="M12 4l4 4-8.5 8.5L3 17l.5-4.5Z" />
      <path d="M10.5 5.5 14.5 9.5" />
    </>
  ),
  heart: <path d="M10 17S3 12.6 3 7.8A3.8 3.8 0 0 1 10 5.6a3.8 3.8 0 0 1 7 2.2C17 12.6 10 17 10 17Z" />,
  music: (
    <>
      <circle cx="6" cy="15" r="2.2" />
      <circle cx="14" cy="13" r="2.2" />
      <path d="M8.2 15V4.5L16.2 3v10" />
    </>
  ),
  palette: (
    <>
      <path d="M10 3a7 7 0 1 0 0 14c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H14a3 3 0 0 0 3-3A7 7 0 0 0 10 3Z" />
      <circle cx="6.5" cy="9" r="0.9" />
      <circle cx="9" cy="6.5" r="0.9" />
      <circle cx="13" cy="7.5" r="0.9" />
    </>
  ),
  "graduation-cap": (
    <>
      <path d="M2 8l8-3.5L18 8l-8 3.5Z" />
      <path d="M5.5 9.8V13c0 1.2 2 2.2 4.5 2.2s4.5-1 4.5-2.2V9.8" />
    </>
  ),
  footprints: (
    <>
      <ellipse cx="6" cy="7" rx="2" ry="2.6" />
      <ellipse cx="14" cy="13" rx="2" ry="2.6" />
    </>
  ),
  sun: (
    <>
      <circle cx="10" cy="10" r="3.4" />
      <path d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
    </>
  ),
  scroll: (
    <>
      <path d="M5 3h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5" />
      <path d="M5 3a2 2 0 0 0 0 4M5 13a2 2 0 0 0 0 4" />
      <path d="M8 7h5M8 10h5" />
    </>
  ),
};

export default function QuestIcon({ iconKey, className = "h-5 w-5" }: Readonly<{ iconKey: QuestIconKey; className?: string }>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {ICON_PATHS[iconKey]}
    </svg>
  );
}

const BADGE_ICON_PATHS: Record<ConsistencyBadgeIcon, React.ReactNode> = {
  "broken-chain": (
    <>
      <rect x="1.5" y="4.5" width="6" height="4" rx="2" transform="rotate(-20 4.5 6.5)" />
      <rect x="8.5" y="7.5" width="6" height="4" rx="2" transform="rotate(-20 11.5 9.5)" />
      <path d="M6.5 6.5l1 3" strokeDasharray="1.2 1.2" />
    </>
  ),
  flame: (
    <path d="M8 1.2c.24 1.6-.34 2.7-1.28 3.7C5.7 6 4.5 7.1 4.5 9.1a3.5 3.5 0 0 0 7 0c0-.9-.3-1.6-.66-2.3-.13.75-.48 1.28-.96 1.6.16-1.36-.36-2.3-1.22-3.2-.48-.5-.96-1.05-1.04-1.8-.5.4-.85.95-1 1.55-.4-.55-.53-1.35-.2-2.8Z" />
  ),
  "brick-stack": (
    <>
      <rect x="1.5" y="2" width="6" height="3" rx="0.6" />
      <rect x="8.5" y="2" width="6" height="3" rx="0.6" />
      <rect x="5" y="6.5" width="6" height="3" rx="0.6" />
      <rect x="1.5" y="11" width="6" height="3" rx="0.6" />
      <rect x="8.5" y="11" width="6" height="3" rx="0.6" />
    </>
  ),
  target: (
    <>
      <circle cx="8" cy="8" r="6.2" />
      <circle cx="8" cy="8" r="3.4" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  "star-medal": <path d="M8 1.4l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2 .7-4.3-3.1-3 4.3-.6Z" />,
  "crown-diamond": (
    <>
      <path d="M2 6.5l2.5 2 3.5-4 3.5 4 2.5-2-.9 6.5H2.9Z" />
      <path d="M3 13.8h10" />
    </>
  ),
};

export function ConsistencyBadgeGlyph({ icon, className = "h-3.5 w-3.5" }: Readonly<{ icon: ConsistencyBadgeIcon; className?: string }>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {BADGE_ICON_PATHS[icon]}
    </svg>
  );
}
