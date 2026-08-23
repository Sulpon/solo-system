"use client";

import DungeonImage from "./DungeonImage";
import { getDungeonRequirements } from "../../_lib/engines/world-map-engine";
import type { WorldDungeon, WorldCity, WorldCountry, DungeonStatus } from "../../_lib/types/world-map";
import type { GoalTree } from "../../_lib/types/goal-tree";

type DungeonCardProps = Readonly<{
  dungeon: WorldDungeon;
  city: WorldCity;
  country: WorldCountry;
  status: DungeonStatus;
  goalTree: GoalTree;
  onClose: () => void;
  onComplete: () => void;
}>;

// One component renders both a regular Dungeon and the Boss (isBoss:true,
// the 5th row of every city's ladder) - the Boss gets a visibly stronger
// treatment (crown header, rank badge, "Enter Battle" framing) per spec,
// via the same isBoss flag the seed data already carries.
export default function DungeonCard({ dungeon, city, country, status, goalTree, onClose, onComplete }: DungeonCardProps) {
  const requirements = getDungeonRequirements(dungeon, goalTree);
  const isBoss = dungeon.isBoss;
  const statusLabel = status === "completed" ? (isBoss ? "Defeated" : "Completed") : status === "available" ? (isBoss ? "Boss Unlocked" : "Available") : "Locked";

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/75 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className={
          "max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border bg-slate-950 sm:max-w-lg sm:rounded-2xl " +
          (isBoss ? "border-rose-500/40 shadow-[0_0_70px_rgba(244,63,94,0.22)]" : "border-amber-500/30 shadow-[0_0_55px_rgba(251,191,36,0.15)]")
        }
      >
        <DungeonImage dungeon={dungeon} className="h-48 w-full" />

        <div className="p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={"text-[10px] font-semibold uppercase tracking-[0.16em] " + (isBoss ? "text-rose-300" : "text-amber-300")}>
                {isBoss ? "👑 Boss" : `Dungeon ${dungeon.dungeonNumber}`}
              </p>
              <h2 className="text-xl font-black text-white">{dungeon.name}</h2>
              <p className="text-xs text-slate-500">
                {city.name}, {country.name}
              </p>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              Close
            </button>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={
                "inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] " +
                (status === "completed"
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-200"
                  : status === "available"
                    ? isBoss
                      ? "border-rose-400/60 bg-rose-400/15 text-rose-200"
                      : "border-amber-400/50 bg-amber-400/10 text-amber-200"
                    : "border-slate-700 bg-slate-900 text-slate-500")
              }
            >
              {statusLabel}
            </span>
            {isBoss && dungeon.bossRank ? (
              <span className="inline-block rounded-full border border-rose-400/40 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-rose-200">
                Rank {dungeon.bossRank}
              </span>
            ) : null}
            {dungeon.verificationStatus === "needs_verification" ? (
              <span className="inline-block rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                Unverified landmark
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-sm text-slate-400">{dungeon.description}</p>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300">Atlas Connection</p>
            <p className="mt-1 text-sm text-slate-300">{dungeon.whyItMatters}</p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300">What to Remember</p>
            <p className="mt-1 text-sm text-slate-300">{dungeon.travelMemoryHook}</p>
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300">Requirements</p>
            <p className="mt-1 text-xs text-slate-500">{city.name} progress ≥ {dungeon.unlockProgressPct}%</p>
            {requirements.length > 0 ? (
              <ul className="mt-1 space-y-1">
                {requirements.map((requirement) => (
                  <li key={requirement.label} className={"text-sm " + (requirement.met ? "text-emerald-300" : "text-slate-500")}>
                    {requirement.met ? "✓" : "✗"} {requirement.label}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-purple-300">Reward</p>
            <p className="mt-1 text-sm text-slate-300">
              +{dungeon.xpReward} XP{dungeon.masteryReward > 0 ? ` · +${dungeon.masteryReward} Mastery XP` : ""}
            </p>
          </div>

          {status === "available" ? (
            <button
              type="button"
              onClick={onComplete}
              className={
                "mt-4 w-full rounded-xl border py-2.5 text-sm font-bold transition " +
                (isBoss ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30" : "border-amber-400/50 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25")
              }
            >
              {isBoss ? "⚔️ Enter Battle" : "Complete Dungeon"}
            </button>
          ) : status === "completed" ? (
            <p className="mt-4 text-center text-sm font-semibold text-emerald-300">{isBoss ? "👑 City Conquered" : "✓ Completed"}</p>
          ) : (
            <p className="mt-4 text-center text-xs text-slate-500">Locked - reach {dungeon.unlockProgressPct}% {city.name} progress to unlock.</p>
          )}
        </div>
      </div>
    </div>
  );
}
