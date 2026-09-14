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
import { useJarvisPlans } from "./useJarvisPlans";
import { isDesktopApp } from "../desktop/is-desktop";
import { computeAchievementMoments } from "../achievements/achievement-moment-engine";
import { computePersonalMemory } from "../memory/memory-engine";
import type { JarvisEntitySeed } from "../jarvis/jarvis-context-engine";
import { executeTool, type ToolExecutionContext } from "../jarvis/tools";
import {
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
import { confirmPlan as confirmPlanPure, cancelPlan as cancelPlanPure, pausePlan as pausePlanPure, continuePlan as continuePlanPure, executeReadySteps, type PlanExecutionData, type PlanExecutionSetters } from "../jarvis/plan-engine";
import { buildOpenApplicationProposal, executeOpenApplicationAction } from "../jarvis/os-actions";
import { runConversationTurn, type CombinedToolResult } from "../jarvis/conversation-engine";
import { callJarvisProvider } from "../jarvis/llm-client";
import { resolveAtlasRequest, executeAuthorizedAction, type AtlasContextInput } from "../ai-core/atlas-ai";
import { logAtlasTrace } from "../ai-core/trace";
import type { JarvisActionProposal, JarvisActionResult, JarvisMessage, JarvisPlan, JarvisStatus, LLMMessage } from "../jarvis/types";

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
  const plans = useJarvisPlans();

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

  const executeCombinedToolRaw = useCallback(
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
        case "propose_open_application":
          return proposeAndTrack(buildOpenApplicationProposal(args), "That application isn't registered as one Atlas can open.");
        default: {
          const result = executeTool(name, args, toolExecutionContext);
          return { ok: result.ok, data: result.data };
        }
      }
    },
    [questDefinitions, questCompletions, attributes, goalTree, atlas.now, toolExecutionContext, proposeAndTrack],
  );

  // Phase 20 Objectives K/M - EVERY tool call the model makes is routed
  // through executeAuthorizedAction (ai-core/permissions.ts) before the
  // real switch statement above ever runs. This is the single agency
  // boundary: the model proposes a tool name, Atlas (this function)
  // authorizes it against the real registry/permission table, and only
  // then does the existing, unchanged executor run. A tool name outside
  // the registered set, or an application-launch attempt outside Atlas
  // Desktop, is denied here - before executeCombinedToolRaw's switch ever
  // sees it - rather than relying on the switch's own `default` fallback.
  const executeCombinedTool = useCallback(
    (name: string, args: Readonly<Record<string, unknown>>): CombinedToolResult => {
      const authorized = executeAuthorizedAction(name, args, { desktopCapable: isDesktopApp() }, executeCombinedToolRaw);
      if (process.env.NODE_ENV !== "production" && !authorized.authorization.allowed) {
        console.debug("[atlas:trace] authorization denied", { tool: name, reason: authorized.authorization.reason });
      }
      return authorized;
    },
    [executeCombinedToolRaw],
  );

  const send = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || status === "sending") return;

      const userMessage: JarvisMessage = { id: `${Date.now()}-user`, role: "user", text: trimmed, createdAt: new Date().toISOString() };
      setMessages((current) => [...current, userMessage]);
      setStatus("sending");

      // Phase 20 Objective C - the single orchestration boundary decides,
      // in one pure call, whether this request: (a) matches the Phase 19.7
      // deterministic Next Action bypass, (b) is an explicit "remember
      // that..." request (Objective G - also fully deterministic, also
      // zero model calls), or (c) needs the model, and if so with exactly
      // which tools/context (Phase 19.8's intent router, reused verbatim).
      // See ai-core/atlas-ai.ts.
      const contextInput: AtlasContextInput = {
        structured: intelligenceContext,
        todaysCalendarItems: atlas.todaysCalendarItems,
        seed: messages.length === 0 ? seed : undefined,
        goalTree,
        quests: questDefinitions,
        notes,
        libraryItems,
        attributes,
        activityEvents,
        focusHistory,
        activePlan: plans.activePlan,
        desktopCapable: isDesktopApp(),
      };

      const outcome = resolveAtlasRequest({ userMessage: trimmed, structured: intelligenceContext, activePlan: plans.activePlan, contextInput, provider: null, model: null });
      logAtlasTrace(outcome.trace);

      if (outcome.kind === "bypass") {
        setMessages((current) => [...current, outcome.message]);
        setStatus("idle");
        return;
      }

      if (outcome.kind === "memory") {
        // Objective G - an explicit memory request builds a real
        // create_note proposal deterministically (memory-candidate.ts) -
        // presented through the EXACT SAME confirm-card UI/flow as any
        // other action proposal (see JarvisMessageBubble.tsx), so it
        // inherits Notes' existing confirmation gate for free.
        pendingProposalsRef.current.set(outcome.proposal.id, outcome.proposal);
        const memoryMessage: JarvisMessage = {
          id: `${Date.now()}-memory`,
          role: "assistant",
          text: "I can save that as a Note so it's available to you later.",
          createdAt: new Date().toISOString(),
          toolsUsed: [],
          actionProposal: outcome.proposal,
        };
        setMessages((current) => [...current, memoryMessage]);
        setStatus("idle");
        return;
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const result = await runConversationTurn({
        systemPrompt: outcome.systemPrompt,
        llmHistory: llmHistoryRef.current,
        userText: trimmed,
        tools: outcome.tools,
        callProvider: (request) => callJarvisProvider(request, controller.signal),
        executeTool: executeCombinedTool,
      });

      llmHistoryRef.current = [...result.llmHistory];
      setMessages((current) => [...current, result.assistantMessage]);
      setStatus(result.assistantMessage.isError ? "error" : "idle");
      abortControllerRef.current = null;

      // Phase 18: a proposed plan is persisted immediately (status
      // "proposed") - it must survive even if the user navigates away
      // before confirming, not only after.
      if (result.assistantMessage.plan) plans.startPlan(result.assistantMessage.plan);
    },
    [status, intelligenceContext, atlas.todaysCalendarItems, messages.length, seed, goalTree, questDefinitions, notes, libraryItems, attributes, activityEvents, focusHistory, executeCombinedTool, plans],
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
    async (proposal: JarvisActionProposal) => {
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
        case "open_application":
          result = await executeOpenApplicationAction(current);
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

  // Reports the real, verified per-step outcome for whichever steps just
  // ran (never every step in the plan - only ones that actually executed
  // in this pass) as one system message, mirroring Phase 16's per-step
  // report.
  const reportStepOutcomes = useCallback((before: JarvisPlan, after: JarvisPlan) => {
    const beforeById = new Map(before.steps.map((step) => [step.id, step]));
    const justRan = after.steps.filter((step) => (step.status === "completed" || step.status === "failed") && beforeById.get(step.id)?.status !== step.status);
    if (justRan.length === 0) return;
    const lines = justRan.map((step, index) => `${index + 1}. ${step.result?.message ?? step.failureReason ?? (step.status === "completed" ? "Done." : "Failed.")}`);
    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-plan-outcome`, role: "system", text: `${after.title}:\n${lines.join("\n")}`, createdAt: new Date().toISOString(), isError: justRan.some((step) => step.status === "failed") },
    ]);
  }, []);

  const executeReadyPlanSteps = useCallback(
    async (planId: string) => {
      const before = plans.plans.find((plan) => plan.id === planId);
      if (!before) return;
      const after = await executeReadySteps(before, planExecutionData, planExecutionSetters);
      plans.updatePlan(planId, () => after);
      reportStepOutcomes(before, after);
    },
    [plans, planExecutionData, planExecutionSetters, reportStepOutcomes],
  );

  // Confirming a plan only ACCEPTS it (proposed -> active) - it does not
  // execute anything by itself. Running its ready step(s) is always a
  // separate, explicit "Execute Ready Step(s)" action (see
  // executeReadyPlanSteps below) - this keeps every mutation gated behind
  // its own visible click, never bundled invisibly into "Confirm."
  const confirmPlan = useCallback(
    (planId: string) => {
      plans.updatePlan(planId, confirmPlanPure);
    },
    [plans],
  );

  const pausePlan = useCallback(
    (planId: string) => {
      plans.updatePlan(planId, pausePlanPure);
    },
    [plans],
  );

  // Continuing only resumes a paused plan (paused -> active) - like
  // confirmPlan, it never executes anything by itself; running its ready
  // step(s) is always the separate, explicit Execute control.
  const continuePlan = useCallback(
    (planId: string) => {
      plans.updatePlan(planId, continuePlanPure);
    },
    [plans],
  );

  const cancelPlan = useCallback(
    (planId: string) => {
      plans.updatePlan(planId, cancelPlanPure);
      setMessages((current) => [...current, { id: `${Date.now()}-plan-cancel`, role: "system", text: "Plan cancelled - remaining steps were never executed.", createdAt: new Date().toISOString() }]);
    },
    [plans],
  );

  return { messages, status, send, stop, reset, confirmAction, cancelAction, activePlan: plans.activePlan, confirmPlan, executeReadyPlanSteps, pausePlan, continuePlan, cancelPlan };
}
