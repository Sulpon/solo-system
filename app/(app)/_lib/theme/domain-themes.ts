import type { CSSProperties } from "react";
import type { CaptureDomain } from "../types/capture";

// The central domain-theme registry.
//
// One source of truth, in TypeScript, emitted as CSS custom properties -
// exactly the pattern AppearanceProvider.tsx already uses for
// --menace-accent/--menace-radius/--menace-density. Deliberately NOT a
// parallel set of [data-domain] blocks in globals.css: tokens defined in
// both places drift, and the labels/decor/motion decisions below are
// needed in TS anyway (headers, empty states, route resolution).
//
// This EXTENDS the existing system rather than competing with it. Every
// domain overrides --menace-accent, so Card.tsx, .menace-card,
// .menace-progress-fill and every component already keyed to that variable
// pick up the domain accent for free, with no component changes and no
// second card/progress/button vocabulary.

export type DomainThemeId =
  | "home-base"
  | "exploration"
  | "peace"
  | "reading"
  | "career"
  | "trading"
  | "startup"
  | "chess"
  | "calisthenics"
  | "mercor"
  | "thesis"
  | "nutrition";

// Motion intensity, honoured by the .atlas-* animation classes in
// globals.css. "calm" is not decoration - Peace and Reading are supposed to
// feel slower than Trading, and that difference is a token, not a per-page
// hardcode. All three are suppressed entirely under prefers-reduced-motion.
export type DomainMotion = "calm" | "standard" | "sharp";

export type DomainDisplayFont = "sans" | "serif";

export type DomainTheme = Readonly<{
  id: DomainThemeId;
  label: string;
  // The single honest line a themed header shows under its title. Describes
  // the space, never claims progress.
  tagline: string;
  motion: DomainMotion;
  display: DomainDisplayFont;
  // Ties a theme to the capture vocabulary that already exists
  // (types/capture.ts) instead of inventing a second domain list. null for
  // themes with no capture counterpart (Home Base, Peace, Exploration).
  captureDomain: CaptureDomain | null;
  // Whether a real route hosts this theme today. The six themes with no
  // page are defined but unreachable - see route-theme.ts. Keeping them
  // here means adding the page later is a one-line map entry, and means
  // nothing invents a look on the spot when it lands.
  hasPage: boolean;
  tokens: DomainThemeTokens;
}>;

export type DomainThemeTokens = Readonly<{
  // rgb triplet, no rgb() wrapper - matches the --menace-accent convention
  // so `rgb(var(--menace-accent) / 0.4)` keeps working everywhere.
  accent: string;
  accentSoft: string;
  // Full CSS background shorthand for the page's atmosphere.
  ambient: string;
  // Low-opacity decorative motif, drawn by ThemeDecorativeLayer.
  decor: string;
  decorOpacity: string;
  surface: string;
  border: string;
  glow: string;
  muted: string;
}>;

function theme(
  id: DomainThemeId,
  label: string,
  tagline: string,
  captureDomain: CaptureDomain | null,
  hasPage: boolean,
  motion: DomainMotion,
  display: DomainDisplayFont,
  tokens: DomainThemeTokens,
): DomainTheme {
  return { id, label, tagline, captureDomain, hasPage, motion, display, tokens };
}

export const DOMAIN_THEMES: Readonly<Record<DomainThemeId, DomainTheme>> = {
  // A. Cinematic Headquarters - dark architectural space, glass and steel.
  "home-base": theme("home-base", "Home Base", "Your current standing, and what matters next.", null, true, "standard", "sans", {
    accent: "167 139 250",
    accentSoft: "56 189 248",
    ambient:
      "radial-gradient(circle at 16% -6%, rgba(139,92,246,0.22), transparent 38rem), radial-gradient(circle at 88% 4%, rgba(56,189,248,0.12), transparent 32rem), linear-gradient(160deg, #04060f 0%, #070a18 45%, #04060f 100%)",
    decor: "repeating-linear-gradient(115deg, rgba(148,163,184,0.10) 0px, rgba(148,163,184,0.10) 1px, transparent 1px, transparent 64px)",
    decorOpacity: "0.5",
    surface: "rgba(8, 12, 24, 0.66)",
    border: "rgba(148, 163, 184, 0.16)",
    glow: "0 0 60px rgba(139, 92, 246, 0.16)",
    muted: "rgba(148, 163, 184, 0.86)",
  }),

  // B. Exploration and Movement - atmospheric, geographic, spacious.
  exploration: theme("exploration", "Outside", "The world beyond the system. Go and see it.", null, true, "calm", "sans", {
    accent: "134 199 148",
    accentSoft: "245 197 122",
    ambient:
      "radial-gradient(ellipse at 50% -20%, rgba(134,199,148,0.16), transparent 40rem), radial-gradient(circle at 12% 88%, rgba(245,197,122,0.09), transparent 34rem), linear-gradient(175deg, #050a09 0%, #08110e 50%, #050908 100%)",
    // Contour lines - a topographic map read at a glance, not a picture of one.
    decor:
      "repeating-radial-gradient(circle at 30% 40%, transparent 0px, transparent 38px, rgba(134,199,148,0.13) 38px, rgba(134,199,148,0.13) 39px), repeating-radial-gradient(circle at 78% 72%, transparent 0px, transparent 46px, rgba(245,197,122,0.09) 46px, rgba(245,197,122,0.09) 47px)",
    decorOpacity: "0.55",
    surface: "rgba(7, 15, 13, 0.6)",
    border: "rgba(134, 199, 148, 0.18)",
    glow: "0 0 70px rgba(134, 199, 148, 0.12)",
    muted: "rgba(160, 180, 168, 0.88)",
  }),

  // C. Calm Sanctuary - the quietest surface in Atlas. Low contrast on
  // purpose; the one place that must not look like a dashboard.
  peace: theme("peace", "Peace", "Nothing to complete here.", null, false, "calm", "serif", {
    accent: "148 163 184",
    accentSoft: "125 211 202",
    ambient:
      "radial-gradient(ellipse at 50% 0%, rgba(125,211,202,0.10), transparent 44rem), radial-gradient(ellipse at 50% 100%, rgba(100,116,139,0.10), transparent 40rem), linear-gradient(180deg, #06080c 0%, #0a0e14 55%, #06080c 100%)",
    decor: "radial-gradient(ellipse at 50% 30%, rgba(148,163,184,0.08), transparent 60%)",
    decorOpacity: "0.8",
    surface: "rgba(10, 14, 20, 0.5)",
    border: "rgba(148, 163, 184, 0.12)",
    glow: "0 0 80px rgba(125, 211, 202, 0.08)",
    muted: "rgba(148, 163, 184, 0.8)",
  }),

  // D. Dark Academia Library - warm wood, parchment, serif.
  reading: theme("reading", "Library", "Books, notes, and what you have taken from them.", "reading", true, "calm", "serif", {
    accent: "217 168 106",
    accentSoft: "191 128 90",
    ambient:
      "radial-gradient(circle at 14% 0%, rgba(217,168,106,0.16), transparent 34rem), radial-gradient(circle at 92% 20%, rgba(120,60,40,0.14), transparent 30rem), linear-gradient(150deg, #0c0906 0%, #140f0a 46%, #0a0705 100%)",
    // Vertical bands: a shelf of spines, abstracted.
    decor:
      "repeating-linear-gradient(90deg, rgba(217,168,106,0.10) 0px, rgba(217,168,106,0.10) 2px, transparent 2px, transparent 26px), linear-gradient(180deg, transparent 70%, rgba(120,60,40,0.16) 100%)",
    decorOpacity: "0.45",
    surface: "rgba(18, 13, 9, 0.66)",
    border: "rgba(217, 168, 106, 0.2)",
    glow: "0 0 55px rgba(191, 128, 90, 0.14)",
    muted: "rgba(200, 178, 150, 0.85)",
  }),

  // E. Professional Growth Command Center - graphite and brass, editorial.
  career: theme("career", "Career", "Positioning, applications, and the record behind them.", "career", true, "standard", "serif", {
    accent: "203 172 106",
    accentSoft: "148 163 184",
    ambient:
      "radial-gradient(circle at 80% -8%, rgba(203,172,106,0.13), transparent 34rem), radial-gradient(circle at 10% 30%, rgba(100,116,139,0.12), transparent 32rem), linear-gradient(165deg, #06070a 0%, #0b0d12 48%, #06070a 100%)",
    decor: "repeating-linear-gradient(0deg, rgba(203,172,106,0.08) 0px, rgba(203,172,106,0.08) 1px, transparent 1px, transparent 88px)",
    decorOpacity: "0.5",
    surface: "rgba(11, 13, 18, 0.68)",
    border: "rgba(203, 172, 106, 0.18)",
    glow: "0 0 50px rgba(203, 172, 106, 0.1)",
    muted: "rgba(163, 170, 184, 0.86)",
  }),

  // F. Institutional Trading Terminal - restrained. Amber and slate, never
  // the neon-green "hacker" cliche, and never a colour that implies a P/L
  // direction the data has not earned.
  trading: theme("trading", "Trading", "Process, risk, and execution quality.", "trading", false, "sharp", "sans", {
    accent: "56 189 248",
    accentSoft: "251 191 36",
    ambient: "radial-gradient(circle at 50% -10%, rgba(56,189,248,0.1), transparent 34rem), linear-gradient(180deg, #04060a 0%, #070a10 50%, #04060a 100%)",
    decor:
      "repeating-linear-gradient(0deg, rgba(56,189,248,0.07) 0px, rgba(56,189,248,0.07) 1px, transparent 1px, transparent 28px), repeating-linear-gradient(90deg, rgba(56,189,248,0.07) 0px, rgba(56,189,248,0.07) 1px, transparent 1px, transparent 28px)",
    decorOpacity: "0.6",
    surface: "rgba(7, 10, 16, 0.74)",
    border: "rgba(56, 189, 248, 0.16)",
    glow: "0 0 44px rgba(56, 189, 248, 0.1)",
    muted: "rgba(148, 163, 184, 0.88)",
  }),

  // G. Founder Workshop - blueprint and warm signal orange.
  startup: theme("startup", "Startup", "What you are building, and what it still needs.", "startup", false, "sharp", "sans", {
    accent: "96 165 250",
    accentSoft: "251 146 60",
    ambient:
      "radial-gradient(circle at 20% -6%, rgba(96,165,250,0.14), transparent 34rem), radial-gradient(circle at 86% 30%, rgba(251,146,60,0.1), transparent 30rem), linear-gradient(155deg, #04060c 0%, #080b14 48%, #04060c 100%)",
    decor:
      "repeating-linear-gradient(0deg, rgba(96,165,250,0.08) 0px, rgba(96,165,250,0.08) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, rgba(96,165,250,0.08) 0px, rgba(96,165,250,0.08) 1px, transparent 1px, transparent 40px)",
    decorOpacity: "0.5",
    surface: "rgba(8, 11, 20, 0.68)",
    border: "rgba(96, 165, 250, 0.18)",
    glow: "0 0 52px rgba(96, 165, 250, 0.12)",
    muted: "rgba(148, 163, 184, 0.88)",
  }),

  // H. Strategic Competitive Arena - ivory, graphite, a restrained gold.
  chess: theme("chess", "Chess", "Positions, decisions, and the quality of your calculation.", "chess", false, "standard", "serif", {
    accent: "226 232 240",
    accentSoft: "212 175 55",
    ambient:
      "radial-gradient(circle at 50% -12%, rgba(226,232,240,0.09), transparent 34rem), radial-gradient(circle at 84% 70%, rgba(212,175,55,0.08), transparent 28rem), linear-gradient(170deg, #06070a 0%, #0a0c11 50%, #06070a 100%)",
    // A board, abstracted to two overlapping half-scale checks.
    decor:
      "repeating-conic-gradient(from 0deg at 50% 50%, rgba(226,232,240,0.05) 0deg 90deg, transparent 90deg 180deg)",
    decorOpacity: "0.45",
    surface: "rgba(10, 12, 17, 0.7)",
    border: "rgba(226, 232, 240, 0.14)",
    glow: "0 0 46px rgba(212, 175, 55, 0.1)",
    muted: "rgba(160, 168, 184, 0.86)",
  }),

  // I. Athlete Progression - steel and trophy amber. Sports-editorial, not
  // fantasy: the numbers here are real training records or nothing.
  calisthenics: theme("calisthenics", "Training", "Real sets, real records, real consistency.", "workout", true, "sharp", "sans", {
    accent: "245 158 11",
    accentSoft: "226 232 240",
    ambient:
      "radial-gradient(circle at 12% -8%, rgba(245,158,11,0.16), transparent 34rem), radial-gradient(circle at 90% 16%, rgba(148,163,184,0.12), transparent 30rem), linear-gradient(158deg, #08060a 0%, #0d0b10 46%, #060509 100%)",
    decor: "repeating-linear-gradient(105deg, rgba(245,158,11,0.09) 0px, rgba(245,158,11,0.09) 2px, transparent 2px, transparent 22px)",
    decorOpacity: "0.42",
    surface: "rgba(13, 11, 16, 0.68)",
    border: "rgba(245, 158, 11, 0.2)",
    glow: "0 0 54px rgba(245, 158, 11, 0.14)",
    muted: "rgba(163, 163, 173, 0.88)",
  }),

  // J. Professional Operations Center - cool teal, deliberately unlike
  // Career's warm brass so the two never read as the same page.
  mercor: theme("mercor", "Operations", "Work sessions, throughput, and delivery quality.", "mercor", false, "sharp", "sans", {
    accent: "45 212 191",
    accentSoft: "148 163 184",
    ambient: "radial-gradient(circle at 78% -6%, rgba(45,212,191,0.13), transparent 32rem), linear-gradient(172deg, #04080a 0%, #070d10 50%, #04080a 100%)",
    decor: "repeating-linear-gradient(90deg, rgba(45,212,191,0.08) 0px, rgba(45,212,191,0.08) 1px, transparent 1px, transparent 56px)",
    decorOpacity: "0.5",
    surface: "rgba(7, 13, 16, 0.7)",
    border: "rgba(45, 212, 191, 0.18)",
    glow: "0 0 48px rgba(45, 212, 191, 0.12)",
    muted: "rgba(148, 170, 172, 0.88)",
  }),

  // K. Scholar Research Campaign - indigo and parchment, academic serif.
  thesis: theme("thesis", "Thesis", "Method, evidence, and the argument you are assembling.", "thesis", true, "calm", "serif", {
    accent: "129 140 248",
    accentSoft: "196 181 253",
    ambient:
      "radial-gradient(circle at 18% -6%, rgba(129,140,248,0.16), transparent 34rem), radial-gradient(circle at 88% 26%, rgba(196,181,253,0.1), transparent 30rem), linear-gradient(162deg, #05060f 0%, #090b18 48%, #05060f 100%)",
    // Ruled paper.
    decor: "repeating-linear-gradient(0deg, rgba(196,181,253,0.07) 0px, rgba(196,181,253,0.07) 1px, transparent 1px, transparent 32px)",
    decorOpacity: "0.5",
    surface: "rgba(9, 11, 24, 0.66)",
    border: "rgba(129, 140, 248, 0.2)",
    glow: "0 0 54px rgba(129, 140, 248, 0.14)",
    muted: "rgba(164, 168, 200, 0.86)",
  }),

  // L. Body-Fuel System - clean lab green and citrus. Practical, never
  // moralising about food.
  nutrition: theme("nutrition", "Nutrition", "What you ate, and what it fuelled.", "nutrition", false, "standard", "sans", {
    accent: "132 204 22",
    accentSoft: "250 204 21",
    ambient:
      "radial-gradient(circle at 22% -8%, rgba(132,204,22,0.14), transparent 32rem), radial-gradient(circle at 88% 22%, rgba(250,204,21,0.09), transparent 28rem), linear-gradient(166deg, #050803 0%, #080d06 48%, #040703 100%)",
    decor: "repeating-linear-gradient(45deg, rgba(132,204,22,0.07) 0px, rgba(132,204,22,0.07) 1px, transparent 1px, transparent 34px)",
    decorOpacity: "0.5",
    surface: "rgba(8, 13, 6, 0.66)",
    border: "rgba(132, 204, 22, 0.18)",
    glow: "0 0 50px rgba(132, 204, 22, 0.12)",
    muted: "rgba(163, 180, 150, 0.86)",
  }),
};

export const DOMAIN_THEME_IDS: ReadonlyArray<DomainThemeId> = Object.keys(DOMAIN_THEMES) as DomainThemeId[];

export const DEFAULT_DOMAIN_THEME_ID: DomainThemeId = "home-base";

export function getDomainTheme(id: DomainThemeId): DomainTheme {
  return DOMAIN_THEMES[id];
}

// Motion durations the .atlas-* animation classes read. Reduced-motion is
// handled once, in globals.css - never by branching here, so a caller can
// never forget it.
const MOTION_DURATIONS: Readonly<Record<DomainMotion, string>> = { calm: "620ms", standard: "380ms", sharp: "220ms" };

const DISPLAY_FONTS: Readonly<Record<DomainDisplayFont, string>> = {
  sans: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif",
  serif: "ui-serif, Georgia, Cambria, 'Times New Roman', serif",
};

// The variables a themed surface consumes. --menace-accent is overridden
// deliberately: it is what makes every EXISTING component (Card,
// menace-card, menace-progress-fill, Progress) adopt the domain accent
// without being touched.
export function domainThemeStyle(theme: DomainTheme): CSSProperties {
  return {
    "--menace-accent": theme.tokens.accent,
    "--atlas-accent": theme.tokens.accent,
    "--atlas-accent-soft": theme.tokens.accentSoft,
    "--atlas-ambient": theme.tokens.ambient,
    "--atlas-decor": theme.tokens.decor,
    "--atlas-decor-opacity": theme.tokens.decorOpacity,
    "--atlas-surface": theme.tokens.surface,
    "--atlas-border": theme.tokens.border,
    "--atlas-glow": theme.tokens.glow,
    "--atlas-muted": theme.tokens.muted,
    "--atlas-display-font": DISPLAY_FONTS[theme.display],
    "--atlas-motion-duration": MOTION_DURATIONS[theme.motion],
  } as CSSProperties;
}
