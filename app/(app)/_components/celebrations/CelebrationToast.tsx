"use client";

import { getKindAccent } from "./celebration-visuals";
import type { CelebrationPayload } from "../../_lib/types/celebration";

type CelebrationToastProps = Readonly<{
  celebration: CelebrationPayload;
  onDismiss: () => void;
}>;

export default function CelebrationToast({ celebration, onDismiss }: CelebrationToastProps) {
  const accent = getKindAccent(celebration.kind);

  return (
    <div
      className={`celebration-toast-enter fixed bottom-6 right-6 z-[70] w-80 rounded-xl border bg-slate-950/95 p-4 backdrop-blur-sm ${accent.border}`}
      role="status"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${accent.text}`}>{celebration.title}</p>
          {celebration.description ? <p className="mt-1 truncate text-sm text-slate-400">{celebration.description}</p> : null}
          {celebration.xpGained ? <p className="mt-1 text-sm font-bold text-emerald-300">+{celebration.xpGained.toLocaleString()} XP</p> : null}
        </div>
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-slate-500 transition hover:text-white">
          ✕
        </button>
      </div>
    </div>
  );
}
