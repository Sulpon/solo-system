"use client";

import type { GoalTreeFilterKey } from "./goal-tree-outline.types";
import { goalTreeFilterTabs } from "./goal-tree-outline.types";

type GoalTreeFiltersProps = Readonly<{
  search: string;
  activeFilter: GoalTreeFilterKey;
  onSearchChange: (next: string) => void;
  onFilterChange: (next: GoalTreeFilterKey) => void;
  onAddGoal: () => void;
}>;

export default function GoalTreeFilters({ search, activeFilter, onSearchChange, onFilterChange, onAddGoal }: GoalTreeFiltersProps) {
  const currentFilterIndex = goalTreeFilterTabs.findIndex((tab) => tab.key === activeFilter);
  const nextFilter = goalTreeFilterTabs[(currentFilterIndex + 1) % goalTreeFilterTabs.length]?.key ?? "all";

  return (
    <div className="rounded-2xl border border-purple-500/20 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(2,6,23,0.92))] p-5 shadow-[0_0_30px_rgba(88,28,135,0.12)] backdrop-blur-xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Goal Tree</p>
          <h1 className="mt-1 text-3xl font-black text-white">Goal Tree</h1>
          <p className="mt-1 text-sm text-slate-400">All your goals structured and connected to your dreams.</p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 xl:min-w-[560px] xl:flex-1 xl:items-end">
          <div className="grid w-full gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <label className="relative block min-w-0">
              <span className="sr-only">Search goals</span>
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Search goals..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 pr-11 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-500">
                <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                  <circle cx="7" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </span>
            </label>

            <button
              type="button"
              onClick={() => onFilterChange(nextFilter)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white"
              aria-label="Cycle goal filters"
              title="Cycle filters"
            >
              <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
                <path d="M2.5 4h11L10 8v3.5l-2 1V8L2.5 4Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              Filter
            </button>

            <button
              type="button"
              onClick={onAddGoal}
              className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-5 py-3 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
            >
              + Add Goal
            </button>
          </div>

          <div className="flex w-full flex-wrap gap-2 xl:justify-end">
            {goalTreeFilterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => onFilterChange(tab.key)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition " +
                  (activeFilter === tab.key
                    ? "border-purple-400/60 bg-purple-500/15 text-purple-100 shadow-[0_0_20px_rgba(168,85,247,0.12)]"
                    : "border-slate-700 bg-slate-950/55 text-slate-400 hover:border-purple-400/40 hover:text-white")
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
