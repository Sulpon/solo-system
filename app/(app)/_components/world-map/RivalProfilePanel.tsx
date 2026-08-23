"use client";

import { getRivalIdentity, getRivalQuestCatalog } from "../../_lib/world-map/rival-roster";
import { getCountry } from "../../_lib/world-map/countries";
import { calculateLevel, getRankLabel } from "../../_lib/engines/level-engine";
import { calculateQuestMastery, getQuestMasteryLevel100Target, getQuestMasteryTitle } from "../../_lib/engines/quest-mastery-engine";
import { getRivalDistance } from "../../_lib/engines/world-map-engine";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import type { RivalState } from "../../_lib/types/rival";

type RivalProfilePanelProps = Readonly<{
  rivalId: string;
  rivalState: RivalState | null;
  playerCountryId: string | null;
  onClose: () => void;
}>;

function proximityLabel(distance: number | null): string {
  if (distance === null) return "Unknown distance";
  if (distance === 0) return "⚔️ In your territory";
  if (distance === 1) return "⚠️ 1 country away";
  return `${distance} countries away`;
}

export default function RivalProfilePanel({ rivalId, rivalState, playerCountryId, onClose }: RivalProfilePanelProps) {
  const { attributes } = useAttributes();
  const identity = getRivalIdentity(rivalId);

  if (!identity || !rivalState) {
    return null;
  }

  const level = calculateLevel(rivalState.totalXp).currentLevel;
  const rank = getRankLabel(level);
  const originCountry = getCountry(identity.originCountryId);
  const currentCountry = getCountry(rivalState.currentCountryId);
  const distance = getRivalDistance(playerCountryId, rivalState.currentCountryId);

  const attributeLevels = Object.entries(rivalState.attributeXp)
    .map(([attributeId, xp]) => {
      const category = attributes.find((entry) => entry.id === attributeId);
      return { attributeId, name: category?.name ?? attributeId, level: calculateLevel(xp).currentLevel };
    })
    .sort((a, b) => b.level - a.level);

  const questCatalog = getRivalQuestCatalog(identity.id);
  const masteryEntries = questCatalog
    .map((quest) => {
      const masteryXp = rivalState.masteryXpByQuestId[quest.id] ?? 0;
      const target = getQuestMasteryLevel100Target(quest.xp, quest.masteryMultiplier);
      const mastery = calculateQuestMastery(masteryXp, target);
      return { title: quest.title, level: mastery.currentLevel, tier: getQuestMasteryTitle(mastery.currentLevel) };
    })
    .sort((a, b) => b.level - a.level)
    .slice(0, 4);

  const territories = rivalState.conqueredCountryIds.map((countryId) => getCountry(countryId)?.name ?? countryId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-full overflow-y-auto rounded-t-2xl border border-rose-500/30 bg-slate-950 p-5 shadow-[0_0_55px_rgba(244,63,94,0.22)] sm:max-w-lg sm:rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl">{identity.icon}</span>
          <div>
            <h2 className="text-xl font-black text-white">{identity.name}</h2>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-rose-300">{identity.title}</p>
          </div>
          <button type="button" onClick={onClose} className="ml-auto rounded-xl border border-slate-700 px-3 py-1 text-sm text-slate-300 transition hover:border-rose-400/60 hover:text-white">
            Close
          </button>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {originCountry?.flag} Origin: {originCountry?.name ?? identity.originCountryId}
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-rose-400/40 bg-rose-500/10 text-lg font-black text-rose-200">{rank}</span>
          <div>
            <p className="text-sm font-bold text-white">Lv {level}</p>
            <p className="text-[10px] uppercase tracking-[0.1em] text-slate-500">Global Rank</p>
          </div>
          <div className="ml-auto text-right text-xs text-slate-400">
            <p className="font-semibold text-rose-300">{proximityLabel(distance)}</p>
            <p className="mt-0.5">
              {currentCountry?.flag} Currently in {currentCountry?.name ?? rivalState.currentCountryId}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300">Strength / Weakness</p>
            <p className="mt-1 text-sm text-white">Strength: {identity.strength}</p>
            <p className="text-sm text-slate-400">Weakness: {identity.weakness}</p>
            <p className="mt-2 text-[11px] uppercase tracking-[0.1em] text-slate-500">Archetype: {identity.archetype}</p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300">Attributes</p>
            <ul className="mt-1 space-y-1">
              {attributeLevels.slice(0, 5).map((entry) => (
                <li key={entry.attributeId} className="flex items-center justify-between text-sm">
                  <span className="text-slate-300">{entry.name}</span>
                  <span className="font-semibold text-white">Lv {entry.level}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300">Quest Mastery</p>
          <ul className="mt-1 space-y-1">
            {masteryEntries.map((entry) => (
              <li key={entry.title} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{entry.title}</span>
                <span className="font-semibold text-white">
                  Lv {entry.level} <span className="text-rose-300">{entry.tier}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-purple-300">Territories ({territories.length})</p>
          {territories.length === 0 ? (
            <p className="mt-1 text-sm text-slate-500">No countries conquered yet.</p>
          ) : (
            <p className="mt-1 text-sm text-white">{territories.join(", ")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
