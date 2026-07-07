import type { CharacterProfile } from "../_lib/types";
import { calculateLevel } from "../_lib/engines/level-engine";
import Card from "./Card";
import Progress from "./Progress";

type CharacterCardProps = Readonly<{
  character: CharacterProfile;
}>;

export default function CharacterCard({ character }: CharacterCardProps) {
  const level = calculateLevel(character.overallXP);

  return (
    <Card className="overflow-hidden border-purple-500/30 bg-[radial-gradient(circle_at_76%_24%,rgba(126,34,206,0.4),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.88),rgba(2,6,23,0.94))] p-6">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/70 to-transparent" />
      <div className="relative grid gap-6 md:grid-cols-[1fr_210px]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-purple-300">Character Status</p>
          <h1 className="mt-3 text-5xl font-black tracking-wide text-white">{character.name}</h1>
          <p className="mt-2 text-slate-400">{character.title}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/55 px-5 py-4 shadow-inner shadow-black/30">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Level</p>
              <p className="mt-1 text-6xl font-black leading-none">{level.currentLevel}</p>
            </div>
            <div className="rounded-xl border border-purple-500/40 bg-purple-500/10 px-5 py-4 shadow-[0_0_24px_rgba(168,85,247,0.14)]">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Rank</p>
              <p className="mt-1 text-6xl font-black leading-none text-purple-300">{character.rank}</p>
            </div>
            <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Streak</p>
              <p className="mt-2 text-3xl font-black text-cyan-200">{character.currentStreak}</p>
              <p className="text-xs text-slate-400">days</p>
            </div>
          </div>

          <div className="mt-8 max-w-xl">
            <div className="mb-2 flex justify-between text-sm text-slate-300">
              <span>XP</span>
              <span>{level.xpInCurrentLevel.toLocaleString()} / {level.xpNeededForNextLevel.toLocaleString()}</span>
            </div>
            <Progress
              value={level.xpInCurrentLevel}
              max={level.xpNeededForNextLevel}
              className="h-3 overflow-hidden rounded-full bg-slate-950/80"
              fillClassName="h-full bg-gradient-to-r from-purple-500 to-cyan-400"
            />
          </div>
        </div>

        <div className="hidden min-h-72 items-center justify-center rounded-2xl border border-purple-500/20 bg-slate-950/35 md:flex">
          <div className="relative flex h-44 w-36 items-center justify-center rounded-full bg-purple-500/10 shadow-[0_0_85px_rgba(168,85,247,0.45)]">
            <div className="absolute h-56 w-40 rounded-full border border-purple-400/20" />
            <div className="absolute h-32 w-24 rounded-full bg-cyan-400/10 blur-2xl" />
            <div className="relative text-7xl font-black text-purple-200">A</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
