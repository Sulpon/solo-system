"use client";

import { useState } from "react";
import { useFocus } from "../../_lib/focus-store";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { getAncestorChain } from "../../_lib/goal-tree-storage";
import StartFocusModal from "./StartFocusModal";
import type { FocusMode } from "../../_lib/types/focus";

export type FocusableQuest = Readonly<{ id: string; title: string; linkedProgressGoalId?: string | null }>;

type FocusButtonProps = Readonly<{
  quest?: FocusableQuest;
  compact?: boolean;
  className?: string;
}>;

export default function FocusButton({ quest, compact = false, className }: FocusButtonProps) {
  const { activeSession, startSession, expand } = useFocus();
  const { goalTree } = useGoalTree();
  const [pickerOpen, setPickerOpen] = useState(false);

  const isThisQuestFocused = Boolean(activeSession && quest && activeSession.linkedQuestId === quest.id);

  function handleClick() {
    if (activeSession) {
      expand();
      return;
    }

    setPickerOpen(true);
  }

  function handleStart(mode: FocusMode, durationMinutes: number) {
    let linkedGoalId: string | null = null;
    let linkedDreamId: string | null = null;

    if (quest?.linkedProgressGoalId) {
      const chain = getAncestorChain(goalTree, quest.linkedProgressGoalId) ?? [];
      linkedGoalId = chain.find((node) => node.type === "long_term_goal")?.id ?? null;
      linkedDreamId = chain.find((node) => node.type === "dream")?.id ?? null;
    }

    startSession({
      mode,
      durationSeconds: Math.round(durationMinutes * 60),
      linkedQuestId: quest?.id ?? null,
      linkedGoalId,
      linkedDreamId,
    });
    setPickerOpen(false);
  }

  const label = activeSession ? (isThisQuestFocused ? "Resume" : "Focus") : "Focus";

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label={quest ? `Focus on ${quest.title}` : "Start a focus session"}
        className={
          className ??
          (compact
            ? "shrink-0 rounded-lg border border-purple-400/30 bg-purple-500/10 px-2 py-1 text-xs font-semibold text-purple-200 transition hover:border-purple-300 hover:bg-purple-500/20"
            : "shrink-0 rounded-lg border border-purple-400/40 bg-purple-500/10 px-3 py-2 text-sm font-semibold text-purple-100 transition hover:border-purple-300 hover:bg-purple-500/20")
        }
      >
        {"▶ " + label}
      </button>
      {pickerOpen ? <StartFocusModal questTitle={quest?.title} onStart={handleStart} onClose={() => setPickerOpen(false)} /> : null}
    </>
  );
}
