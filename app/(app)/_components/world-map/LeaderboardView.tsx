"use client";

import { RIVAL_IDENTITIES } from "../../_lib/world-map/rival-roster";
import { calculateLevel, getRankLabel } from "../../_lib/engines/level-engine";
import { getWorldStatistics, type WorldMapDungeonProgress } from "../../_lib/engines/world-map-engine";
import { useProgression } from "../../_lib/hooks/useProgression";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import type { RivalState } from "../../_lib/types/rival";

type LeaderboardViewProps = Readonly<{
  rivalStates: Readonly<Record<string, RivalState>>;
  dungeonProgress: WorldMapDungeonProgress;
  onSelectRival: (rivalId: string) => void;
}>;

export default function LeaderboardView({ rivalStates, dungeonProgress, onSelectRival }: LeaderboardViewProps) {
  const { isReady, progressionSummary } = useProgression();
  const { goalTree, hasLoaded } = useGoalTree();

  if (!isReady || !hasLoaded) {
    return null;
  }

  const youLevel = progressionSummary.currentLevel;
  const youRank = getRankLabel(youLevel);
  const youStats = getWorldStatistics(goalTree, dungeonProgress);

  const entries = [
    { id: "you", name: "YOU", icon: "🧍", level: youLevel, rank: youRank, countries: youStats.countriesConquered, bosses: youStats.bossesDefeated, isUser: true, isRival: false },
    ...RIVAL_IDENTITIES.map((identity) => {
      const state = rivalStates[identity.id];
      const level = state ? calculateLevel(state.totalXp).currentLevel : 1;
      return {
        id: identity.id,
        name: identity.name,
        icon: identity.icon,
        level,
        rank: getRankLabel(level),
        countries: state?.conqueredCountryIds.length ?? 0,
        bosses: state ? Object.values(state.bossAttempts).filter((attempt) => attempt.defeated).length : 0,
        isUser: false,
        isRival: true,
      };
    }),
  ].sort((first, second) => second.level - first.level);

  const aheadOfYou = entries.filter((entry) => !entry.isUser && entry.level > youLevel).sort((first, second) => first.level - second.level);
  const closestRival = aheadOfYou[0];

  return (
    <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Leaderboard · Global</p>
        <p className="mt-1 text-sm text-slate-400">18 fictional rivals, each simulated day by day from their own personality and activity - not real people, never scripted to match you.</p>
      </div>

      {closestRival ? (
        <p className="mt-3 text-xs text-slate-400">
          <span className="font-semibold text-purple-200">{closestRival.level - youLevel}</span> level{closestRival.level - youLevel === 1 ? "" : "s"} until you overtake{" "}
          <span className="font-semibold text-white">{closestRival.name}</span>.
        </p>
      ) : (
        <p className="mt-3 text-xs text-emerald-300">You&rsquo;re ahead of every rival right now.</p>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
              <th className="px-2 py-2">#</th>
              <th className="px-2 py-2">Rival</th>
              <th className="px-2 py-2">Level</th>
              <th className="px-2 py-2">Rank</th>
              <th className="px-2 py-2">Countries</th>
              <th className="px-2 py-2">Bosses</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr
                key={entry.id}
                onClick={() => entry.isRival && onSelectRival(entry.id)}
                className={"border-t border-slate-800 " + (entry.isUser ? "bg-purple-500/10" : "cursor-pointer hover:bg-slate-900/60")}
              >
                <td className="px-2 py-2 text-xs font-bold text-slate-500">#{index + 1}</td>
                <td className="px-2 py-2">
                  <span className="flex items-center gap-2">
                    <span>{entry.icon}</span>
                    <span className={"font-semibold " + (entry.isUser ? "text-purple-100" : "text-white")}>{entry.name}</span>
                  </span>
                </td>
                <td className="px-2 py-2 font-black text-white">Lv {entry.level}</td>
                <td className="px-2 py-2 text-slate-300">{entry.rank}</td>
                <td className="px-2 py-2 text-slate-300">{entry.countries}</td>
                <td className="px-2 py-2 text-slate-300">{entry.bosses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
