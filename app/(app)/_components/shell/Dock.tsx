"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Grid3x3 } from "lucide-react";
import { isNavItemActive, usePinnedAppNavItems } from "../../_lib/icons/app-icon-map";

type DockProps = Readonly<{ onOpenLauncher: () => void }>;

// Fixed, bottom-center, desktop-only (see the md:flex gate below - mobile
// navigation stays the Sidebar drawer, see Sidebar.tsx's own comment on
// why). Sits at z-30, the same layer as the System Bar - both are
// persistent chrome siblings of <main>, never wrapping it, so neither can
// interfere with Dashboard's dnd-kit grid or Attributes' CustomizablePage
// drag-reorder underneath.
export default function Dock({ onOpenLauncher }: DockProps) {
  const pathname = usePathname();
  const pinnedItems = usePinnedAppNavItems();

  return (
    <nav
      aria-label="Atlas applications"
      className="fixed inset-x-0 bottom-4 z-30 hidden justify-center md:flex"
    >
      <div className="flex items-center gap-1.5 rounded-2xl border border-purple-500/30 bg-slate-950/90 p-2 shadow-[0_16px_48px_rgba(2,6,23,0.55)] backdrop-blur-xl">
        <button
          type="button"
          onClick={onOpenLauncher}
          aria-label="Open Atlas launcher"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-purple-300 transition hover:bg-purple-500/15 hover:text-white"
        >
          <Grid3x3 className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="mx-1 h-6 w-px bg-slate-800" aria-hidden="true" />
        {pinnedItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavItemActive(pathname, item.href);

          return (
            <Link
              key={item.key}
              href={item.href}
              title={item.name}
              aria-label={item.name}
              className={
                "relative flex h-10 w-10 items-center justify-center rounded-xl transition " +
                (isActive ? "bg-purple-500/20 text-white shadow-[inset_0_0_0_1px_rgba(168,85,247,0.35)]" : "text-slate-400 hover:bg-slate-900/70 hover:text-white")
              }
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {isActive ? <span className="absolute -bottom-1 h-1 w-1 rounded-full bg-purple-300" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
