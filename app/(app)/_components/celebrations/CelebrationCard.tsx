"use client";

import { getKindAccent } from "./celebration-visuals";
import type { CelebrationPayload } from "../../_lib/types/celebration";

type CelebrationCardProps = Readonly<{
  celebration: CelebrationPayload;
  onDismiss: () => void;
}>;

export default function CelebrationCard({ celebration, onDismiss }: CelebrationCardProps) {
  const accent = getKindAccent(celebration.kind);

  return (
    <div className={`celebration-card-enter fixed left-1/2 top-6 z-[70] w-[26rem] max-w-[92vw] -translate-x-1/2 rounded-2xl border bg-slate-950/95 px-5 py-4 shadow-xl backdrop-blur-sm ${accent.border}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-sm font-black uppercase tracking-[0.14em] ${accent.text}`}>{celebration.title}</p>
          {celebration.description ? <p className="mt-1 text-sm text-slate-400">{celebration.description}</p> : null}
          {celebration.fromValue !== undefined && celebration.toValue !== undefined ? (
            <p className="mt-1 text-sm text-slate-300">
              {celebration.fromValue} <span className="text-slate-600">→</span> <span className="font-bold text-white">{celebration.toValue}</span>
            </p>
          ) : null}
          {celebration.xpGained ? <p className="mt-1 text-sm font-bold text-emerald-300">+{celebration.xpGained.toLocaleString()} XP</p> : null}
        </div>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1 text-xs text-slate-300 transition hover:text-white">
          Dismiss
        </button>
      </div>
    </div>
  );
}
