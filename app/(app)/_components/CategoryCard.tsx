import type { CategoryProgression } from "../_lib/engines/progression-engine";
import Progress from "./Progress";

type CategoryCardProps = Readonly<{
  category: CategoryProgression;
}>;

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/45 p-4 transition hover:border-purple-500/40 hover:bg-slate-900/80">
      <h3 className="min-h-10 whitespace-normal break-words font-bold leading-tight text-white">{category.name}</h3>
      <p className="mt-1 text-xs text-slate-500">{category.description}</p>
      <p className="mt-2 text-sm text-purple-300">Level {category.level}</p>
      <Progress
        value={category.xp}
        max={category.max}
        className="mt-4 h-2 overflow-hidden rounded-full bg-slate-950/80"
        fillClassName={"h-full " + category.accent}
      />
      <p className="mt-2 text-xs text-slate-500">
        {category.xp} / {category.max} XP
      </p>
    </div>
  );
}
