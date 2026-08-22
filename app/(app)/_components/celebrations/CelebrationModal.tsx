"use client";

import { getKindAccent } from "./celebration-visuals";
import MysteryRewardRoulette from "./MysteryRewardRoulette";
import type { CelebrationPayload } from "../../_lib/types/celebration";

type CelebrationModalProps = Readonly<{
  celebration: CelebrationPayload;
  onDismiss: () => void;
}>;

export default function CelebrationModal({ celebration, onDismiss }: CelebrationModalProps) {
  const accent = getKindAccent(celebration.kind);
  const isLegendary = celebration.intensity === "legendary";
  const isMysteryReward = celebration.kind === "mystery_reward" && celebration.reward;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div
        className={
          "celebration-modal-enter w-full max-w-lg rounded-3xl border bg-slate-950 p-8 text-center " +
          accent.border +
          " " +
          (isLegendary ? "celebration-legendary-glow" : "shadow-[0_0_50px_rgba(124,58,237,0.22)]")
        }
      >
        {!isMysteryReward ? (
          <>
            <p className={`text-xs font-bold uppercase tracking-[0.3em] ${accent.text}`}>{celebration.kind.replaceAll("_", " ")}</p>
            <h2 className="mt-3 text-3xl font-black uppercase tracking-[0.06em] text-white">{celebration.title}</h2>
            {celebration.description ? <p className="mt-2 text-sm text-slate-400">{celebration.description}</p> : null}
            {celebration.fromValue !== undefined && celebration.toValue !== undefined ? (
              <p className="mt-4 text-lg text-slate-300">
                {celebration.fromValue} <span className="text-slate-600">→</span> <span className="font-black text-white">{celebration.toValue}</span>
              </p>
            ) : null}
            {celebration.xpGained ? <p className="mt-3 text-2xl font-black text-emerald-300">+{celebration.xpGained.toLocaleString()} XP</p> : null}
          </>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-amber-200">Mystery Reward</p>
            <div className="mt-5">
              <MysteryRewardRoulette reward={celebration.reward!} />
            </div>
          </>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="mt-7 rounded-xl border border-slate-700 px-6 py-2 text-sm font-semibold text-slate-200 transition hover:border-purple-400/60 hover:text-white"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
