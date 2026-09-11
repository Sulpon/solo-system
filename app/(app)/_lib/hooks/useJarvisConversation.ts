"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useAtlasContext } from "../atlas-context";
import { useAtlasIntelligenceContext } from "./useAtlasIntelligenceContext";
import { useGoalTree } from "./useGoalTree";
import { useProgression } from "./useProgression";
import { useNotes } from "./useNotes";
import { useLibrary } from "./useLibrary";
import { useAttributes } from "./useAttributes";
import { useFocusHistory } from "./useFocusHistory";
import { computeAchievementMoments } from "../achievements/achievement-moment-engine";
import { computePersonalMemory } from "../memory/memory-engine";
import { selectContextSlices } from "../jarvis/context-selector";
import { buildJarvisContext, type JarvisEntitySeed } from "../jarvis/jarvis-context-engine";
import { JARVIS_SYSTEM_PROMPT } from "../jarvis/system-prompt";
import { JARVIS_TOOLS, executeTool, type ToolExecutionContext } from "../jarvis/tools";
import {
  JARVIS_ACTION_TOOLS,
  buildScheduleQuestProposal,
  executeScheduleQuestAction,
  buildCreateQuestProposal,
  executeCreateQuestAction,
  buildCompleteQuestProposal,
  buildLogHabitProposal,
  executeCompleteOrLogAction,
  buildCreateNoteProposal,
  executeCreateNoteAction,
  buildUpdateGoalProposal,
  executeUpdateGoalAction,
  rebuildProposal,
  type RebuildContext,
} from "../jarvis/actions";
import { executePlanSequentially, type PlanExecutionData, type PlanExecutionSetters } from "../jarvis/plan-engine";
import { runConversationTurn, type CombinedToolResult } from "../jarvis/conversation-engine";
import { callJarvisProvider } from "../jarvis/llm-client";
import type { JarvisActionProposal, JarvisActionResult, JarvisMessage, JarvisPlan, JarvisStatus, LLMMessage } from "../jarvis/types";

const ALL_TOOLS = [...JARVIS_TOOLS, ...JARVIS_ACTION_TOOLS];

// Phase 14's React wiring - gathers real Atlas data (same hooks every other
// JARVIS-adjacent engine already uses), builds the per-turn bounded
// JarvisContext, and runs the conversation via the pure conversation-engine.
// Conversation history lives ONLY in this hook's React state - never
// written to Personal Memory, never persisted (Step 11: "conversation
// history != Personal Memory").
export function useJarvisConversation(seed?: JarvisEntitySeed) {
  const atlas = useAtlasContext();
  const intelligenceContext = useAtlasIntelligenceContext();
  const { goalTree, saveNode, updateProgressGoal } = useGoalTree();
  const { questDefinitions, questCompletions, activityEvents, setQuestDefinitions, completeQuest } = useProgression();
  const { notes, addNote } = useNotes();
  const { items: libraryItems } = useLibrary();
  const { attributes } = useAttributes();
  const { history: focusHistory } = useFocusHistory();

  const [messages, setMessages] = useState<JarvisMessage[]>([]);
  const [status, setStatus] = useState<JarvisStatus>("idle");
  const llmHistoryRef = useRef<LLMMessage[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pendingProposalsRef = useRef<Map<string, JarvisActionProposal>>(new Map());

  const achievementMoments = useMemo(
    () => computeAchievementMoments({ now: atlas.now, goalTree, quests: questDefinitions, completions: questCompletions, notes, libraryItems, attributes, focusHistory, activityEvents }),
    [atlas.now, goalTree, questDefinitions, questCompletions, notes, libraryItems, attributes, focusHistory, activityEvents],
  );

  const memories = useMemo(
    () => computePersonalMemory({ now: atlas.now, goalTree, quests: questDefinitions, completions: questCompletions, notes, libraryItems, attributes, focusHistory, activityEvents, achievementMoments }),
    [atlas.now, goalTree, questDefinitions, questCompletions, notes, libraryItems, attributes, focusHistory, activityEvents, achievementMoments],
  );

  const toolExecutionContext: ToolExecutionContext = useMemo(
    () => ({
      now: atlas.now,
      structured: intelligenceContext,
      achievementMoments,
      memories,
      goalTree,
      quests: questDefinitions,
      completions: questCompletions,
      notes,
      libraryItems,
      attributes,
      focusHistory,
      activityEvents,
      todaysCalendarItems: atlas.todaysCalendarItems,
    }),
    [atlas.now, intelligenceContext, achievementMoments, memories, goalTree, questDefinitions, questCompletions, notes, libraryItems, attributes, focusHistory, activityEvents, atlas.todaysCalendarItems],
  );

  const rebuildContext: RebuildContext = useMemo(
    () => ({ now: atlas.now, quests: questDefinitions, completions: questCompletions, goalTree, attributes }),
    [atlas.now, questDefinitions, questCompletions, goalTree, attributes],
  );

  const planExecutionData: PlanExecutionData = useMemo(
    () => ({ now: atlas.now, quests: questDefinitions, completions: questCompletions, goalTree, attributes }),
    [atlas.now, questDefinitions, questCompletions, goalTree, attributes],
  );

  const planExecutionSetters: PlanExecutionSetters = useMemo(
    () => ({ setQuestDefinitions, completeQuest, addNote, saveNode, updateProgressGoal }),
    [setQuestDefinitions, completeQuest, addNote, saveNode, updateProgressGoal],
  );

  const proposeAndTrack = useCallback((proposal: JarvisActionProposal | null, failureReason: string): CombinedToolResult => {
    if (!proposal) return { ok: false, data: { error: failureReason } };
    pendingProposalsRef.current.set(proposal.id, proposal);
    return { ok: true, data: { proposed: true, summary: proposal.summary, preview: proposal.preview }, actionProposal: proposal };
  }, []);

  const executeCombinedTool = useCallback(
    (name: string, args: Readonly<Record<string, unknown>>): CombinedToolResult => {
      switch (name) {
        case "propose_schedule_quest":
          return proposeAndTrack(buildScheduleQuestProposal(args, questDefinitions), "No matching Quest found to schedule.");
        case "propose_create_quest":
          return proposeAndTrack(buildCreateQuestProposal(args, attributes), "That Quest could not be created - the Skill must be a real, existing one you already track.");
        case "propose_complete_quest":
          return proposeAndTrack(
            buildCompleteQuestProposal(args, questDefinitions, questCompletions, atlas.now),
            "That Quest can't be completed here - it may not exist, already be completed today, or require a linked Goal's numeric progress, which needs the Quests page.",
          );
        case "propose_log_habit":
          return proposeAndTrack(
            buildLogHabitProposal(args, questDefinitions, questCompletions, atlas.now),
            "That Habit can't be logged here - it may not exist, already be logged today, or require a linked Goal's numeric progress, which needs the Quests page.",
          );
        case "propose_create_note":
          return proposeAndTrack(buildCreateNoteProposal(args), "A Note needs both a title and content.");
        case "propose_update_goal":
          return proposeAndTrack(buildUpdateGoalProposal(args, goalTree), "No matching Goal found, or no real change was specified.");
        default: {
          const result = executeTool(name, args, toolExecutionContext);
          return { ok: result.ok, data: result.data };
        }
      }
    },
    [questDefinitions, questCompletions, attributes, goalTree, atlas.now, toolExecutionContext, proposeAndTrack],
  );

  const send = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || status === "sending") return;

      const userMessage: JarvisMessage = { id: `${Date.now()}-user`, role: "user", text: trimmed, createdAt: new Date().toISOString() };
      setMessages((current) => [...current, userMessage]);
      setStatus("sending");

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const selectedSlices = selectContextSlices(trimmed);
      const jarvisContext = buildJarvisContext({
        structured: intelligenceContext,
        todaysCalendarItems: atlas.todaysCalendarItems,
        selectedSlices,
        seed: messages.length === 0 ? seed : undefined,
        goalTree,
        quests: questDefinitions,
        notes,
        libraryItems,
        attributes,
        activityEvents,
        focusHistory,
      });

      const systemPrompt = `${JARVIS_SYSTEM_PROMPT}\n\n---\nCurrent structured Atlas context (authoritative, real data only, JSON):\n${JSON.stringify(jarvisContext)}`;

      const result = await runConversationTurn({
        systemPrompt,
        llmHistory: llmHistoryRef.current,
        userText: trimmed,
        tools: ALL_TOOLS,
        callProvider: (request) => callJarvisProvider(request, controller.signal),
        executeTool: executeCombinedTool,
      });

      llmHistoryRef.current = [...result.llmHistory];
      setMessages((current) => [...current, result.assistantMessage]);
      setStatus(result.assistantMessage.isError ? "error" : "idle");
      abortControllerRef.current = null;
    },
    [status, intelligenceContext, atlas.todaysCalendarItems, messages.length, seed, goalTree, questDefinitions, notes, libraryItems, attributes, activityEvents, focusHistory, executeCombinedTool],
  );

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    setMessages([]);
    llmHistoryRef.current = [];
    pendingProposalsRef.current.clear();
    setStatus("idle");
  }, []);

  const confirmAction = useCallback(
    (proposal: JarvisActionProposal) => {
      pendingProposalsRef.current.delete(proposal.id);

      // Phase 16 stale-action protection: rebuild the proposal from its own
      // sourceTool/sourceArgs against the CURRENT state before executing -
      // the proposal shown may be minutes old.
      const current = rebuildProposal(proposal.sourceTool, proposal.sourceArgs, rebuildContext);
      if (!current) {
        setMessages((prev) => [...prev, { id: `${Date.now()}-confirm`, role: "system", text: `"${proposal.summary}" is no longer valid given the current state - nothing was changed.`, createdAt: new Date().toISOString(), isError: true }]);
        return;
      }

      let result: JarvisActionResult;
      switch (current.actionType) {
        case "schedule_quest":
          result = executeScheduleQuestAction(current, questDefinitions, setQuestDefinitions);
          break;
        case "create_quest":
          result = executeCreateQuestAction(current, questDefinitions, setQuestDefinitions);
          break;
        case "complete_quest":
        case "log_habit":
          result = executeCompleteOrLogAction(current, questDefinitions, completeQuest);
          break;
        case "create_note":
          result = executeCreateNoteAction(current, addNote);
          break;
        case "update_goal":
          result = executeUpdateGoalAction(current, goalTree, updateProgressGoal, saveNode);
          break;
        default:
          result = { ok: false, message: "Unknown action.", verified: [] };
      }

      // The message reports the VERIFIED result (what the real mutation
      // function actually returned/produced), never the original proposal
      // assumed successful.
      setMessages((prev) => [...prev, { id: `${Date.now()}-confirm`, role: "system", text: result.message, createdAt: new Date().toISOString(), isError: !result.ok }]);
    },
    [rebuildContext, questDefinitions, setQuestDefinitions, completeQuest, addNote, goalTree, updateProgressGoal, saveNode],
  );

  const cancelAction = useCallback((proposalId: string) => {
    pendingProposalsRef.current.delete(proposalId);
    setMessages((current) => [...current, { id: `${Date.now()}-cancel`, role: "system", text: "Cancelled.", createdAt: new Date().toISOString() }]);
  }, []);

  const confirmPlan = useCallback(
    (plan: JarvisPlan) => {
      const outcomes = executePlanSequentially(plan, planExecutionData, planExecutionSetters);
      const lines = outcomes.map((outcome, index) => `${index + 1}. ${outcome.result.message}`);
      const allOk = outcomes.every((outcome) => outcome.result.ok);
      setMessages((current) => [
        ...current,
        { id: `${Date.now()}-plan-confirm`, role: "system", text: `${plan.title}:\n${lines.join("\n")}`, createdAt: new Date().toISOString(), isError: !allOk },
      ]);
    },
    [planExecutionData, planExecutionSetters],
  );

  const cancelPlan = useCallback(() => {
    setMessages((current) => [...current, { id: `${Date.now()}-plan-cancel`, role: "system", text: "Plan cancelled - nothing was changed.", createdAt: new Date().toISOString() }]);
  }, []);

  return { messages, status, send, stop, reset, confirmAction, cancelAction, confirmPlan, cancelPlan };
}
