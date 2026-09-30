"use client";

import ThemeDecorativeLayer from "./ThemeDecorativeLayer";
import { useDomainTheme } from "../../_lib/hooks/useDomainTheme";

type ThemeHeaderProps = Readonly<{
  title: string;
  // Short label above the title. Defaults to the domain's own name, so a
  // page never has to restate which environment it is in.
  eyebrow?: string;
  // One line under the title. Defaults to the domain's tagline, which
  // describes the space and never claims progress - a header must not be
  // able to assert a number the data has not earned.
  subtitle?: string;
  actions?: React.ReactNode;
  // Small, real figures shown at the right. Rendered only when supplied;
  // there is no placeholder state, because an invented statistic is worse
  // than no statistic.
  children?: React.ReactNode;
}>;

// The themed page header, replacing the purple-hardcoded PageHeader for
// domain pages. PageHeader.tsx stays exactly as it is - it is still used
// by Attributes/Career/Self-Development for a genuinely different
// level-and-XP presentation, and rewriting it would change those pages'
// behaviour for no reason.
export default function ThemeHeader({ title, eyebrow, subtitle, actions, children }: ThemeHeaderProps) {
  const theme = useDomainTheme();

  return (
    <header className="atlas-surface atlas-page-enter relative overflow-hidden rounded-2xl border p-6 md:p-8">
      <ThemeDecorativeLayer className="[mask-image:linear-gradient(to_bottom,black,transparent)]" />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="atlas-accent text-[0.7rem] font-semibold uppercase tracking-[0.28em]">{eyebrow ?? theme.label}</p>
          <h1 className="atlas-display mt-3 text-3xl font-bold tracking-tight text-white md:text-4xl">{title}</h1>
          <p className="atlas-muted mt-2 max-w-2xl text-sm">{subtitle ?? theme.tagline}</p>
        </div>

        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>

      {children ? <div className="relative mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div> : null}
    </header>
  );
}
