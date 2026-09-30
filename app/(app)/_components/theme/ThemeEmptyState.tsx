import type { LucideIcon } from "lucide-react";

type ThemeEmptyStateProps = Readonly<{
  icon?: LucideIcon;
  title: string;
  // What the user would do to make real data exist here. Never a
  // reassurance, never a fabricated preview of what the filled state would
  // look like.
  description: string;
  action?: React.ReactNode;
  testId?: string;
}>;

// The honest empty state. Every themed page uses this where it has no
// data, instead of rendering zeros, sample rows, or a blurred "demo"
// behind a prompt - all three read as real information at a glance, which
// is the failure mode the data-integrity rules exist to prevent.
export default function ThemeEmptyState({ icon: Icon, title, description, action, testId }: ThemeEmptyStateProps) {
  return (
    <div data-testid={testId} className="atlas-surface flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-12 text-center">
      {Icon ? <Icon aria-hidden className="atlas-accent h-7 w-7 opacity-70" /> : null}
      <p className="atlas-display text-base font-semibold text-white">{title}</p>
      <p className="atlas-muted max-w-md text-sm">{description}</p>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
