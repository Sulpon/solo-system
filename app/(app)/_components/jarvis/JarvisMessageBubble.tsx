"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import JarvisActionConfirmCard from "./JarvisActionConfirmCard";
import type { JarvisActionProposal, JarvisMessage } from "../../_lib/jarvis/types";

type JarvisMessageBubbleProps = Readonly<{
  message: JarvisMessage;
  onConfirmAction: (proposal: JarvisActionProposal) => void;
  onCancelAction: (proposalId: string) => void;
}>;

// Phase 14 Step 6 - the conversation surface. Evidence (Step 10) starts
// collapsed ("do not overload the initial presentation"); every evidence
// line rendered here came from a real tool result (see
// conversation-engine.ts's extractEvidenceFromToolData), never the
// model's own prose.
//
// Phase 18: a proposed multi-step plan is no longer rendered inline here -
// it is now PERSISTENT (see useJarvisPlans.ts), so its one live view is the
// pinned "Active Plan" panel in JarvisPageClient, which keeps working
// correctly across a refresh where this message list would be empty.
export default function JarvisMessageBubble({ message, onConfirmAction, onCancelAction }: JarvisMessageBubbleProps) {
  const [expanded, setExpanded] = useState(false);

  if (message.role === "system") {
    // Phase 15/16: a system message after a confirmed action or plan
    // reports the VERIFIED result(s), which can legitimately include a
    // failure (e.g. "already completed today") - styled distinctly so a
    // failed confirmation never reads as a quiet success. A plan's
    // multi-line, numbered outcome needs whitespace preserved.
    return <p className={`whitespace-pre-wrap text-center text-xs ${message.isError ? "text-rose-300" : "text-slate-500"}`}>{message.text}</p>;
  }

  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={
          "max-w-[85%] rounded-2xl px-4 py-3 " +
          (isUser
            ? "border border-purple-400/30 bg-purple-500/15 text-white"
            : message.isError
              ? "border border-rose-500/30 bg-rose-500/5 text-rose-200"
              : "border border-cyan-400/20 bg-slate-950/70 text-slate-200")
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-6">{message.text}</p>

        {message.evidence && message.evidence.length > 0 ? (
          <div className="mt-2.5">
            <button type="button" onClick={() => setExpanded((current) => !current)} className="flex items-center gap-1.5 text-xs font-semibold text-cyan-300/80 transition hover:text-cyan-200">
              <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
              {expanded ? "Hide Evidence" : "View Evidence"}
            </button>
            {expanded ? (
              <ul className="mt-2 space-y-1 border-t border-slate-800 pt-2">
                {message.evidence.map((item, index) => (
                  <li key={index} className="text-xs text-slate-400">
                    • {item.label}
                    {item.value ? ` (${item.value})` : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        {message.actionProposal ? (
          <div className="mt-3">
            <JarvisActionConfirmCard proposal={message.actionProposal} onConfirm={onConfirmAction} onCancel={onCancelAction} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
