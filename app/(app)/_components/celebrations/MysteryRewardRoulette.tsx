"use client";

import { useEffect, useMemo, useState } from "react";
import { MYSTERY_REWARD_POOL } from "../../_lib/rewards/mystery-reward-pool";
import { getRarityClasses } from "./celebration-visuals";
import type { RewardDefinition } from "../../_lib/types/reward";

const ITEM_WIDTH = 96;
const VISIBLE_ITEMS = 5;
const STRIP_LENGTH = 24;
const TARGET_INDEX = 19;

type MysteryRewardRouletteProps = Readonly<{
  reward: RewardDefinition;
  onSettled?: () => void;
}>;

function buildStrip(target: RewardDefinition): RewardDefinition[] {
  const strip: RewardDefinition[] = [];

  for (let i = 0; i < STRIP_LENGTH; i += 1) {
    if (i === TARGET_INDEX) {
      strip.push(target);
      continue;
    }

    strip.push(MYSTERY_REWARD_POOL[Math.floor(Math.random() * MYSTERY_REWARD_POOL.length)]);
  }

  return strip;
}

export default function MysteryRewardRoulette({ reward, onSettled }: MysteryRewardRouletteProps) {
  const strip = useMemo(() => buildStrip(reward), [reward]);
  const [settled, setSettled] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const spinTimer = setTimeout(() => setSettled(true), 60);
    const revealTimer = setTimeout(() => {
      setRevealed(true);
      onSettled?.();
    }, 2400);

    return () => {
      clearTimeout(spinTimer);
      clearTimeout(revealTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reward.id]);

  const containerWidth = ITEM_WIDTH * VISIBLE_ITEMS;
  const offset = settled ? -(ITEM_WIDTH * TARGET_INDEX - containerWidth / 2 + ITEM_WIDTH / 2) : 0;
  const rarity = getRarityClasses(reward.rarity);

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70" style={{ width: containerWidth }}>
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-amber-300/70 to-transparent" />
        <div
          className="flex"
          style={{
            transform: `translateX(${offset}px)`,
            transition: settled ? "transform 2.1s cubic-bezier(0.1, 0.82, 0.24, 1)" : "none",
          }}
        >
          {strip.map((item, index) => {
            const itemRarity = getRarityClasses(item.rarity);
            return (
              <div
                key={`${item.id}-${index}`}
                className={`flex h-24 shrink-0 flex-col items-center justify-center gap-1 border-r border-slate-800/60 ${itemRarity.bg}`}
                style={{ width: ITEM_WIDTH }}
              >
                <span className={`text-2xl ${itemRarity.text}`}>{item.icon ?? "?"}</span>
              </div>
            );
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-slate-950 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-slate-950 to-transparent" />
      </div>

      <div className={`min-h-[4.5rem] text-center transition-opacity duration-500 ${revealed ? "opacity-100" : "opacity-0"}`}>
        {revealed ? (
          <div className={`rounded-xl border px-5 py-3 ${rarity.border} ${rarity.bg} ${rarity.glow}`}>
            <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${rarity.text}`}>{reward.rarity}</p>
            <p className="mt-1 text-lg font-black text-white">{reward.title}</p>
            {reward.description ? <p className="mt-1 text-sm text-slate-400">{reward.description}</p> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
