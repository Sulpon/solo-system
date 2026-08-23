"use client";

import { RIVAL_ARCHETYPES } from "../../_lib/world-map/rivals";
import { getRivalLevel } from "../../_lib/engines/world-map-engine";
import { getRankLabel } from "../../_lib/engines/level-engine";
import { useProgression } from "../../_lib/hooks/useProgression";

export default function LeaderboardView() {
  const { isReady, progressionSummary } = useProgression();

  if (!isReady) {
    return null;
  }

  const youLevel = progressionSummary.currentLevel;
  const youRank = getRankLabel(youLevel);

  const entries = [
    { id: "you", name: "YOU", icon: "🧍", level: youLevel, isUser: true },
    ...RIVAL_ARCHETYPES.map((rival) => ({ id: rival.id, name: rival.name, icon: rival.icon, level: getRivalLevel(rival), isUser: false })),
  ].sort((first, second) => second.level - first.level);

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Leaderboard</p>
        <p className="mt-1 text-sm text-slate-400">Fictional rivals for motivation - not real people. Their growth is slow and fixed, never random.</p>
      </div>

      <div className="mt-4 space-y-2">
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className={
              "flex items-center gap-3 rounded-xl border px-4 py-3 " +
              (entry.isUser ? "border-purple-400/50 bg-purple-500/10 shadow-[0_0_18px_rgba(168,85,247,0.18)]" : "border-slate-800 bg-slate-950/50")
            }
          >
            <span className="w-6 text-center text-xs font-bold text-slate-500">#{index + 1}</span>
            <span className="text-xl">{entry.icon}</span>
            <div className="min-w-0 flex-1">
              <p className={"truncate text-sm font-bold " + (entry.isUser ? "text-purple-100" : "text-white")}>{entry.name}</p>
              {entry.isUser ? <p className="text-xs text-slate-500">Rank {youRank}</p> : null}
            </div>
            <span className="text-lg font-black text-white">Lv {entry.level}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1.5 border-t border-slate-800 pt-4">
        {RIVAL_ARCHETYPES.filter((rival) => getRivalLevel(rival) > youLevel).map((rival) => {
          const gap = getRivalLevel(rival) - youLevel;
          return (
            <p key={rival.id} className="text-xs text-slate-400">
              <span className="font-semibold text-purple-200">{gap}</span> level{gap === 1 ? "" : "s"} until you overtake <span className="font-semibold text-white">{rival.name}</span>.
            </p>
          );
        })}
        {RIVAL_ARCHETYPES.every((rival) => getRivalLevel(rival) <= youLevel) ? <p className="text-xs text-emerald-300">You're ahead of every rival right now.</p> : null}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {RIVAL_ARCHETYPES.map((rival) => (
          <div key={rival.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="flex items-center gap-1.5 text-sm font-bold text-white">
              <span>{rival.icon}</span> {rival.name}
            </p>
            <p className="mt-1 text-xs text-slate-500">{rival.description}</p>
            <div className="mt-2 space-y-1">
              {Object.entries(rival.statProfile).map(([stat, value]) => (
                <div key={stat} className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>{stat}</span>
                  <span className="font-semibold text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
