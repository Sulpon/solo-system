"use client";

import Card from "../Card";
import Progress from "../Progress";
import type { CategoryProgression } from "../../_lib/engines/progression-engine";
import type { DailySnapshotAttributeXp } from "../../_lib/types/daily-system";

type AttributeOverviewCardProps = Readonly<{
  categories: ReadonlyArray<CategoryProgression>;
  todayAttributeXp: ReadonlyArray<DailySnapshotAttributeXp>;
}>;

export default function AttributeOverviewCard({ categories, todayAttributeXp }: AttributeOverviewCardProps) {
  const todayXpByAttribute = new Map(todayAttributeXp.map((entry) => [entry.attributeId, entry.amount]));

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Attributes</p>
          <h2 className="mt-1 text-xl font-black text-white">Live category growth</h2>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {categories.map((category) => {
          const todayXp = todayXpByAttribute.get(category.id) ?? 0;

          return (
            <div key={category.id} className="rounded-xl border border-slate-800/80 bg-slate-950/45 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{category.name}</p>
                  <p className="mt-1 text-xs text-slate-500">Level {category.level}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-cyan-200">{category.progress}%</span>
              </div>
              <Progress
                value={category.progress}
                max={100}
                className="mt-3 h-2 overflow-hidden rounded-full bg-slate-950/80"
                fillClassName={"h-full " + category.accent}
              />
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
                <span>{category.xpInCurrentLevel.toLocaleString()} / {category.xpNeededForNextLevel.toLocaleString()} XP</span>
                <span className={todayXp > 0 ? "font-semibold text-emerald-300" : "text-slate-600"}>+{todayXp.toLocaleString()} today</span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
