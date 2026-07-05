import type { DailyQuest } from "../_lib/types";

type QuestCardProps = Readonly<{
  quest: DailyQuest;
  completed: boolean;
  onToggle: (id: string) => void;
}>;

export default function QuestCard({ quest, completed, onToggle }: QuestCardProps) {
  return (
    <label
      className={
        "group flex min-h-32 cursor-pointer flex-col justify-between rounded-xl border p-4 transition duration-200 " +
        (completed
          ? "border-purple-400/60 bg-purple-500/15 shadow-[0_0_28px_rgba(168,85,247,0.2)]"
          : "border-slate-700/80 bg-slate-950/45 hover:border-purple-500/40 hover:bg-slate-900/80")
      }
    >
      <span>
        <span className={"block text-sm font-semibold " + (completed ? "text-purple-100" : "text-white")}>{quest.title}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500 group-hover:text-slate-400">{quest.description}</span>
      </span>
      <span className="mt-5 flex items-center justify-between text-sm">
        <input type="checkbox" checked={completed} onChange={() => onToggle(quest.id)} className="accent-purple-500" />
        <span className={completed ? "text-emerald-300" : "text-purple-300"}>+{quest.xp} XP</span>
      </span>
    </label>
  );
}
