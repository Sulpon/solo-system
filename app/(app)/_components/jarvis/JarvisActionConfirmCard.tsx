"use client";

import { useState } from "react";
import type { JarvisActionProposal } from "../../_lib/jarvis/types";

// Phase 14/15 - the ONLY place a proposed Atlas mutation can become real.
// Local `resolved` state prevents double-confirm/re-click; the actual
// mutation happens in useJarvisConversation's confirmAction, which reuses
// an existing Atlas mutation path per action type (see actions.ts). The
// `preview` table (Phase 15) shows the exact before/after change, not just
// a one-line summary - "show the exact proposed change" before the user
// commits to it.
type JarvisActionConfirmCardProps = Readonly<{
  proposal: JarvisActionProposal;
  onConfirm: (proposal: JarvisActionProposal) => void;
  onCancel: (proposalId: string) => void;
}>;

export default function JarvisActionConfirmCard({ proposal, onConfirm, onCancel }: JarvisActionConfirmCardProps) {
  const [resolved, setResolved] = useState<"pending" | "confirmed" | "cancelled">("pending");

  if (resolved !== "pending") {
    return <p className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs text-slate-500">{resolved === "confirmed" ? "Confirmed." : "Cancelled."}</p>;
  }

  return (
    <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-300">Proposed Action</p>
      <p className="mt-1 text-sm text-white">{proposal.summary}</p>

      {proposal.preview.length > 0 ? (
        <div className="mt-2.5 space-y-1 border-t border-amber-400/15 pt-2.5">
          {proposal.preview.map((field) => (
            <div key={field.label} className="flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-500">{field.label}</span>
              <span className="flex items-center gap-1.5 text-right">
                {field.before ? <span className="text-slate-500 line-through decoration-slate-700">{field.before}</span> : null}
                <span className="font-semibold text-white">{field.after}</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            setResolved("confirmed");
            onConfirm(proposal);
          }}
          className="rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/25"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => {
            setResolved("cancelled");
            onCancel(proposal.id);
          }}
          className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
