import { getRarityClasses } from "../celebrations/celebration-visuals";
import type { UnlockedReward } from "../../_lib/types/reward";

type RewardGridProps = Readonly<{
  rewards: ReadonlyArray<UnlockedReward>;
  emptyText: string;
}>;

export default function RewardGrid({ rewards, emptyText }: RewardGridProps) {
  if (rewards.length === 0) {
    return <p className="rounded-xl border border-dashed border-slate-700 bg-slate-950/40 p-6 text-center text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rewards.map((unlocked) => {
        const rarity = getRarityClasses(unlocked.reward.rarity);

        return (
          <div key={unlocked.id} className={`rounded-xl border p-4 ${rarity.border} ${rarity.bg}`}>
            <div className="flex items-start justify-between gap-2">
              <span className={`text-2xl ${rarity.text}`}>{unlocked.reward.icon ?? "◆"}</span>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${rarity.text}`}>{unlocked.reward.rarity}</span>
            </div>
            <p className="mt-2 text-sm font-bold text-white">{unlocked.reward.title}</p>
            {unlocked.reward.description ? <p className="mt-1 text-xs text-slate-400">{unlocked.reward.description}</p> : null}
            <p className="mt-2 text-[11px] text-slate-500">{new Date(unlocked.unlockedAt).toLocaleDateString()}</p>
          </div>
        );
      })}
    </div>
  );
}
