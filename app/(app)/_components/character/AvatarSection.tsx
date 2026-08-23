"use client";

import dynamic from "next/dynamic";
import { AVATAR_TOGGLEABLE_MESHES } from "../../_lib/types/player-character";
import type { AvatarConfig } from "../../_lib/types/player-character";

// three.js/WebGL touch browser-only APIs at module init - never server-render
// the 3D canvas.
const AvatarStage = dynamic(() => import("./AvatarStage"), {
  ssr: false,
  loading: () => <div className="aspect-[3/4] w-full max-w-md animate-pulse rounded-2xl border border-slate-800 bg-slate-950/60" />,
});

type AvatarSectionProps = Readonly<{
  avatarConfig: AvatarConfig;
  onSetMeshVisible: (meshName: string, visible: boolean) => void;
  level: number;
  rank: string;
  heightCm?: number;
  weightKg?: number;
  weightUnit?: string;
}>;

const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function AvatarSection({ avatarConfig, onSetMeshVisible, level, rank, heightCm, weightKg, weightUnit }: AvatarSectionProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AvatarStage modelUrl={avatarConfig.modelUrl} hiddenMeshNames={avatarConfig.hiddenMeshNames} />

      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
          <p className={labelClass}>Info</p>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <div>
              <p className={labelClass}>Level</p>
              <p className="mt-1 text-xl font-black text-white">{level}</p>
            </div>
            <div>
              <p className={labelClass}>Rank</p>
              <p className="mt-1 text-xl font-black text-purple-300">{rank}</p>
            </div>
            <div>
              <p className={labelClass}>Height</p>
              <p className="mt-1 text-xl font-black text-white">{heightCm !== undefined ? `${heightCm} cm` : "—"}</p>
            </div>
            <div>
              <p className={labelClass}>Weight</p>
              <p className="mt-1 text-xl font-black text-white">{weightKg !== undefined ? `${weightKg} ${weightUnit ?? "kg"}` : "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
          <p className={labelClass}>Mesh Visibility</p>
          <p className="mt-1 text-xs text-slate-500">Show or hide the real meshes exported inside your avatar's GLB file.</p>
          <div className="mt-3 space-y-2">
            {AVATAR_TOGGLEABLE_MESHES.map((entry) => {
              const visible = !avatarConfig.hiddenMeshNames.includes(entry.meshName);
              return (
                <label key={entry.meshName} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm text-slate-300">
                  <span>{entry.label}</span>
                  <input type="checkbox" checked={visible} onChange={(event) => onSetMeshVisible(entry.meshName, event.target.checked)} className="accent-purple-500" />
                </label>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500">
          This avatar is your real 3D model, generated once from your reference photos. Level and Rank come from Atlas progression - they never change how the avatar looks. Appearance only changes
          when you update it from new measurements or a new avatar version.
        </p>
      </div>
    </div>
  );
}
