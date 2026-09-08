"use client";

import type { Category } from "../../_lib/types/category";
import type { GoalNode } from "../../_lib/types/goal-tree";

export type CalendarStatusFilter = "all" | "scheduled" | "completed" | "missed";

const STATUS_OPTIONS: ReadonlyArray<{ id: CalendarStatusFilter; label: string }> = [
  { id: "all", label: "All Quests" },
  { id: "scheduled", label: "Planned" },
  { id: "completed", label: "Completed" },
  { id: "missed", label: "Missed" },
];

const selectClass = "rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400";

type CalendarFiltersProps = Readonly<{
  status: CalendarStatusFilter;
  onStatusChange: (status: CalendarStatusFilter) => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  categories: ReadonlyArray<Category>;
  dreamId: string;
  onDreamChange: (dreamId: string) => void;
  dreams: ReadonlyArray<GoalNode>;
}>;

export default function CalendarFilters({ status, onStatusChange, categoryId, onCategoryChange, categories, dreamId, onDreamChange, dreams }: CalendarFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1.5">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onStatusChange(option.id)}
            className={
              "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition " +
              (status === option.id ? "border-purple-400/60 bg-purple-500/15 text-purple-100" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      <select value={categoryId} onChange={(event) => onCategoryChange(event.target.value)} className={selectClass}>
        <option value="all">All Categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>

      {dreams.length > 0 ? (
        <select value={dreamId} onChange={(event) => onDreamChange(event.target.value)} className={selectClass}>
          <option value="all">All Goals</option>
          {dreams.map((dream) => (
            <option key={dream.id} value={dream.id}>
              {dream.title}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
