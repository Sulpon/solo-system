"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import CustomizablePage from "../page-edit/CustomizablePage";
import { getCatalogWidgetsForPage } from "../../_lib/widgets/catalog-registry";
import { GoalTreeStatsCard, StatNumberCard } from "../page-edit/StatWidgets";
import { buildDefaultAttributeWeights } from "../../_lib/goal-tree-attributes";
import { calculateGoalTree, summarizeGoalTree } from "../../_lib/goal-tree-progress";
import { getInheritedAttributeWeights, getSequentialMilestoneProgress, type GoalNodeDraft } from "../../_lib/goal-tree-storage";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import type { Quest } from "../../_lib/types/quest";
import type { GoalNode, GoalNodeType, SequentialMilestoneStep } from "../../_lib/types/goal-tree";
import type { EditablePageSection } from "../page-edit/types";
import GoalNodeEditor, { type GoalNodeFormState } from "./GoalNodeEditor";
import GoalTreeDetailsPanel from "./GoalTreeDetailsPanel";
import GoalTreeFilters from "./GoalTreeFilters";
import GoalTreeSummaryCards from "./GoalTreeSummaryCards";
import GoalTreeTable from "./GoalTreeTable";
import GoalTreeChildTypeModal from "./GoalTreeChildTypeModal";
import QuestForm, { type QuestFormModel } from "../quests/QuestForm";
import { createQuestFormModel, toQuestForm, upsertQuestFromForm } from "../quests/quest-form.utils";
import {
  collectGoalTreeOutlineRows,
  collectNodesByFilter,
  collectRelatedQuestTitlesForFilter,
  findOutlineNode,
  findOutlineParentTitle,
  findOutlinePath,
  getGoalTreeFilterLabel,
} from "./goal-tree-outline.utils";
import type { GoalTreeFilterKey } from "./goal-tree-outline.types";

const emptyForm: GoalNodeFormState = {
  title: "",
  description: "",
  attributes: [],
  attributeWeights: [],
  type: "dream",
  status: "not_started",
  parentId: null,
  currentValue: 0,
  targetValue: 100,
  unit: "",
  steps: [],
  currentStepIndex: 0,
  completed: false,
};

function getChildType(type: GoalNodeType): GoalNodeType {
  if (type === "dream") {
    return "long_term_goal";
  }

  if (type === "long_term_goal") {
    return "milestone";
  }

  if (type === "milestone") {
    return "quest";
  }

  return "quest";
}

function toForm(node: GoalNode): GoalNodeFormState {
  const sequence = node.type === "sequential_milestone" ? getSequentialMilestoneProgress(node.steps ?? []) : null;

  return {
    id: node.id,
    parentId: node.parentId ?? null,
    title: node.title,
    description: node.description ?? "",
    attributes: node.type === "dream" ? [...(node.attributes ?? [])] : [],
    attributeWeights:
      node.type === "dream"
        ? [...(node.attributeWeights ?? (node.attributes ? buildDefaultAttributeWeights(node.attributes) : []))]
        : [],
    type: node.type,
    status: node.status,
    currentValue: node.currentValue ?? 0,
    targetValue: node.targetValue ?? 100,
    unit: node.unit ?? "",
    steps: node.type === "sequential_milestone" ? [...(node.steps ?? [])] : [],
    currentStepIndex: sequence?.currentStepIndex ?? 0,
    completed: sequence?.completed ?? false,
  };
}

function countGoalTypes(nodes: ReadonlyArray<GoalNode>) {
  return nodes.reduce(
    (accumulator, node) => {
      switch (node.type) {
        case "dream":
          accumulator.dreams += 1;
          break;
        case "long_term_goal":
          accumulator.goals += 1;
          break;
        case "milestone":
        case "sequential_milestone":
          accumulator.milestones += 1;
          break;
        case "progress_goal":
          accumulator.progressGoals += 1;
          break;
        default:
          break;
      }

      const nested = countGoalTypes(node.children);
      accumulator.dreams += nested.dreams;
      accumulator.goals += nested.goals;
      accumulator.milestones += nested.milestones;
      accumulator.progressGoals += nested.progressGoals;
      return accumulator;
    },
    {
      dreams: 0,
      goals: 0,
      milestones: 0,
      progressGoals: 0,
    },
  );
}

function EmptyState({ onCreateDream }: Readonly<{ onCreateDream: () => void }>) {
  return (
    <Card className="overflow-hidden border-purple-500/25 bg-[radial-gradient(circle_at_12%_0%,rgba(126,34,206,0.18),transparent_24%),linear-gradient(135deg,rgba(15,23,42,0.72),rgba(2,6,23,0.92))] p-6">
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Goal Tree</p>
        <h2 className="mt-3 text-2xl font-black text-white">Create your first dream</h2>
        <p className="mt-3 text-sm text-slate-400">Break long-term goals into milestones and daily quests.</p>
        <button
          type="button"
          onClick={onCreateDream}
          className="mt-6 rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          Create Dream
        </button>
      </div>
    </Card>
  );
}

function NoMatchState() {
  return (
    <Card className="border-slate-800 bg-slate-950/45 p-6">
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">No Matches</p>
        <h2 className="mt-3 text-2xl font-black text-white">No goals match the current view</h2>
        <p className="mt-3 text-sm text-slate-400">Try a different filter or clear the search field.</p>
      </div>
    </Card>
  );
}

function TipBanner() {
  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-950/45 p-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/55 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-200">
            <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden="true">
              <path d="M8 2.5L9.4 5.8L12.9 6.1L10.2 8.4L11 11.8L8 10.1L5 11.8L5.8 8.4L3.1 6.1L6.6 5.8L8 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Tip</p>
            <p className="text-sm text-slate-400">Break down your big dreams into smaller goals and milestones.</p>
          </div>
        </div>
        <p className="text-sm text-purple-300">Learn more about goal setting →</p>
      </div>
    </Card>
  );
}

export default function GoalTreePage() {
  const { goalTree, hasLoaded, createRootNode, createChildNode, saveNode, deleteNode, completeSequentialStep, undoSequentialStep } = useGoalTree();
  const { questDefinitions, setQuestDefinitions, activityEvents } = useProgression();
  const availableWidgets = useMemo(() => getCatalogWidgetsForPage("goal-tree"), []);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(() => new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingChildParentId, setPendingChildParentId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<GoalTreeFilterKey>("all");
  const [editorForm, setEditorForm] = useState<GoalNodeFormState | null>(null);
  const [questForm, setQuestForm] = useState<QuestFormModel | null>(null);

  const visualTree = useMemo(() => calculateGoalTree(goalTree), [goalTree]);
  const summary = useMemo(() => summarizeGoalTree(goalTree), [goalTree]);
  const typeCounts = useMemo(() => countGoalTypes(goalTree), [goalTree]);
  const outlineRows = useMemo(
    () =>
      collectGoalTreeOutlineRows(visualTree, {
        search,
        filter: activeFilter,
        collapsedIds,
      }),
    [activeFilter, collapsedIds, search, visualTree],
  );
  const visibleSelectedNodeId = selectedNodeId && outlineRows.some((row) => row.node.id === selectedNodeId) ? selectedNodeId : outlineRows[0]?.node.id ?? null;
  const selectedNode = useMemo(() => (visibleSelectedNodeId ? findOutlineNode(visualTree, visibleSelectedNodeId) : null), [visibleSelectedNodeId, visualTree]);
  const selectedNodePath = useMemo(() => findOutlinePath(visualTree, visibleSelectedNodeId), [visibleSelectedNodeId, visualTree]);
  const parentTitle = useMemo(() => findOutlineParentTitle(visualTree, selectedNode?.parentId), [selectedNode?.parentId, visualTree]);
  const dreamTitle = selectedNodePath[0]?.title;
  const inheritedAttributeWeights = useMemo(
    () => (visibleSelectedNodeId ? getInheritedAttributeWeights(goalTree, visibleSelectedNodeId) : []),
    [goalTree, visibleSelectedNodeId],
  );
  const activeFilterNodes = useMemo(() => collectNodesByFilter(visualTree, activeFilter), [activeFilter, visualTree]);
  const activeFilterRelatedQuestTitles = useMemo(
    () => collectRelatedQuestTitlesForFilter(visualTree, questDefinitions, activeFilter),
    [activeFilter, questDefinitions, visualTree],
  );
  const activeFilterProgress = useMemo(() => {
    if (activeFilter === "all") {
      return summary.progress;
    }

    if (activeFilterNodes.length === 0) {
      return 0;
    }

    return Math.round(activeFilterNodes.reduce((total, node) => total + node.progress, 0) / activeFilterNodes.length);
  }, [activeFilter, activeFilterNodes, summary.progress]);
  const activeFilterOverview = useMemo(
    () => ({
      title: getGoalTreeFilterLabel(activeFilter),
      count: activeFilter === "all" ? summary.rootCount : activeFilterNodes.length,
      progress: activeFilterProgress,
      relatedQuestTitles: activeFilter === "all" ? [] : activeFilterRelatedQuestTitles,
      subtitle:
        activeFilter === "all"
          ? "All goals across the tree"
          : activeFilter === "progress_goals"
            ? "Directly linked quests appear here."
            : "Quests linked to progress goals under this branch.",
    }),
    [activeFilter, activeFilterNodes.length, activeFilterProgress, activeFilterRelatedQuestTitles, summary.rootCount],
  );
  const statsSections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "goal-tree-progress-summary",
        title: "Dream Progress Summary",
        description: "Overall progress across the current goal tree.",
        size: "xl",
        readOnly: true,
        content: <GoalTreeStatsCard goalTree={goalTree} />,
      },
      {
        id: "goal-tree-nodes",
        title: "Goal Completion Breakdown",
        description: "Counts of dreams, goals, milestones, and progress goals.",
        size: "lg",
        readOnly: true,
        content: (
          <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Breakdown</p>
            <h2 className="mt-2 text-xl font-black text-white">Goal tree structure</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[
                ["Dreams", typeCounts.dreams],
                ["Goals", typeCounts.goals],
                ["Milestones", typeCounts.milestones],
                ["Progress", typeCounts.progressGoals],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</p>
                  <p className="mt-2 text-3xl font-black text-white">{value}</p>
                </div>
              ))}
            </div>
          </Card>
        ),
      },
      {
        id: "goal-tree-related-quests",
        title: "Related Quests Summary",
        description: "Quest definitions connected to progress goals.",
        size: "md",
        readOnly: true,
        content: <StatNumberCard eyebrow="Related Quests" title="Linked quests" value={questDefinitions.filter((quest) => quest.linkedProgressGoalId).length.toLocaleString()} description="Quests linked to progress goals." accentClass="text-emerald-300" />,
      },
      {
        id: "goal-tree-recent-events",
        title: "Recently Completed Nodes",
        description: "Completed goal activity from the shared event stream.",
        size: "md",
        readOnly: true,
        content: <StatNumberCard eyebrow="Activity" title="Goal events" value={activityEvents.filter((event) => event.type.includes("completed")).length.toLocaleString()} description="Completion events emitted by Goal Tree." accentClass="text-purple-300" />,
      },
    ],
    [activityEvents, goalTree, questDefinitions, typeCounts.dreams, typeCounts.goals, typeCounts.milestones, typeCounts.progressGoals],
  );
  const linkedQuests = useMemo(
    () => (selectedNode ? questDefinitions.filter((quest) => quest.linkedProgressGoalId === selectedNode.id) : []),
    [questDefinitions, selectedNode],
  );
  const pendingChildParent = useMemo(
    () => (pendingChildParentId ? findOutlineNode(visualTree, pendingChildParentId) : null),
    [pendingChildParentId, visualTree],
  );

  function handleSelectSummaryFilter(filter: GoalTreeFilterKey) {
    setActiveFilter((current) => {
      if (current === filter && filter !== "all") {
        return "all";
      }

      return filter;
    });
  }

  function openCreateRoot() {
    setEditorForm(emptyForm);
  }

  function openAddChild(nodeId: string) {
    const parent = findOutlineNode(visualTree, nodeId);

    if (!parent || parent.type === "sequential_milestone") {
      return;
    }

    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(parent.id);
      return next;
    });

    setSelectedNodeId(parent.id);
    setPendingChildParentId(parent.id);
    setEditorForm(null);
    setQuestForm(null);
  }

  function closeChildTypePicker() {
    setPendingChildParentId(null);
  }

  function chooseChildType(type: GoalNodeType) {
    if (!pendingChildParent) {
      return;
    }

    if (type === "quest") {
      setEditorForm(null);
      setQuestForm(
        createQuestFormModel({
          linkedProgressGoalId: pendingChildParent.type === "progress_goal" ? pendingChildParent.id : null,
        }),
      );
      setPendingChildParentId(null);
      return;
    }

    setQuestForm(null);
    setEditorForm({
      ...emptyForm,
      parentId: pendingChildParent.id,
      type,
    });
    setPendingChildParentId(null);
  }

  function openEdit(nodeId: string) {
    const node = findOutlineNode(visualTree, nodeId);

    if (!node) {
      return;
    }

    setSelectedNodeId(node.id);
    setEditorForm(toForm(node));
  }

  function openEditQuest(quest: Quest) {
    setQuestForm(toQuestForm(quest));
  }

  function deleteQuest(questId: string) {
    setQuestDefinitions((current) => current.filter((quest) => quest.id !== questId));
  }

  function saveQuest() {
    if (!questForm || !questForm.title.trim()) {
      return;
    }

    setQuestDefinitions((current) => upsertQuestFromForm(current, questForm));
    setQuestForm(null);
  }

  function handleGoalNodeChange(nextForm: GoalNodeFormState) {
    if (nextForm.type === "quest" && editorForm?.type !== "quest") {
      const parentNode = nextForm.parentId ? findOutlineNode(visualTree, nextForm.parentId) : null;
      setEditorForm(null);
      setQuestForm(
        createQuestFormModel({
          title: nextForm.title,
          description: nextForm.description,
          linkedProgressGoalId: parentNode?.type === "progress_goal" ? parentNode.id : null,
        }),
      );
      return;
    }

    setEditorForm(nextForm);
  }

  function saveGoalNode() {
    if (!editorForm || !editorForm.title.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const steps = editorForm.type === "sequential_milestone"
      ? editorForm.steps.map((step: SequentialMilestoneStep) => ({
          id: step.id,
          title: step.title.trim(),
          description: step.description?.trim() || undefined,
          completed: Boolean(step.completed),
        }))
      : [];
    const sequence = editorForm.type === "sequential_milestone" ? getSequentialMilestoneProgress(steps) : null;

    const draft: GoalNodeDraft = {
      id: editorForm.id,
      parentId: editorForm.parentId ?? null,
      title: editorForm.title,
      description: editorForm.description,
      type: editorForm.type,
      status: editorForm.status,
      currentValue: editorForm.type === "progress_goal" ? Math.max(0, Number(editorForm.currentValue ?? 0)) : undefined,
      targetValue: editorForm.type === "progress_goal" ? Math.max(1, Number(editorForm.targetValue ?? 1)) : undefined,
      unit: editorForm.type === "progress_goal" ? editorForm.unit : undefined,
      steps: editorForm.type === "sequential_milestone" ? steps : undefined,
      currentStepIndex: editorForm.type === "sequential_milestone" ? sequence?.currentStepIndex : undefined,
      completed: editorForm.type === "sequential_milestone" ? sequence?.completed : undefined,
      updatedAt: now,
      createdAt: editorForm.id ? undefined : now,
      attributes: editorForm.type === "dream" ? editorForm.attributes : undefined,
      attributeWeights: editorForm.type === "dream" ? editorForm.attributeWeights : undefined,
    };

    if (editorForm.id) {
      saveNode(editorForm.id, (current) => ({
        ...current,
        title: draft.title.trim(),
        description: draft.description.trim() || undefined,
        type: draft.type,
        status: draft.status,
        parentId: draft.parentId ?? undefined,
        attributes: draft.type === "dream" ? draft.attributes ?? [] : undefined,
        attributeWeights: draft.type === "dream" ? draft.attributeWeights ?? [] : undefined,
        currentValue: draft.type === "progress_goal" ? Math.max(0, Number(draft.currentValue ?? 0)) : undefined,
        targetValue: draft.type === "progress_goal" ? Math.max(1, Number(draft.targetValue ?? 1)) : undefined,
        unit: draft.type === "progress_goal" ? draft.unit?.trim() || undefined : undefined,
        steps: draft.type === "sequential_milestone" ? steps : undefined,
        currentStepIndex: draft.type === "sequential_milestone" ? sequence?.currentStepIndex : undefined,
        completed: draft.type === "sequential_milestone" ? sequence?.completed : undefined,
        progress:
          draft.type === "progress_goal"
            ? Math.min(100, Math.round((Math.max(0, Number(draft.currentValue ?? 0)) / Math.max(1, Number(draft.targetValue ?? 1))) * 100))
            : draft.type === "sequential_milestone"
              ? sequence?.progress ?? current.progress
              : current.progress,
        updatedAt: now,
      }));
      setEditorForm(null);
      return;
    }

    if (!draft.parentId) {
      createRootNode(draft);
    } else {
      createChildNode(draft.parentId, draft);
    }

    setEditorForm(null);
  }

  function handleDelete(nodeId: string) {
    const node = findOutlineNode(visualTree, nodeId);

    if (!node) {
      return;
    }

    if (node.children.length > 0 && !window.confirm("Delete this goal and all of its children?")) {
      return;
    }

    deleteNode(node.id);
    setCollapsedIds((current) => {
      const next = new Set(current);
      next.delete(node.id);
      return next;
    });
    setSelectedNodeId((current) => (current === node.id ? null : current));
  }

  function handleUpdateProgress(nodeId: string) {
    const node = findOutlineNode(visualTree, nodeId);

    if (!node) {
      return;
    }

    if (node.type === "progress_goal") {
      setEditorForm(toForm(node));
      return;
    }

    if (node.type === "sequential_milestone") {
      if (node.completed) {
        undoSequentialStep(node.id);
      } else {
        completeSequentialStep(node.id);
      }
    }
  }

  if (!hasLoaded) {
    return (
      <Card className="p-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4 text-sm text-slate-400">Loading goal tree...</div>
      </Card>
    );
  }

  const isEmpty = goalTree.length === 0;

  return (
    <div className="space-y-5">
      <GoalTreeFilters search={search} activeFilter={activeFilter} onSearchChange={setSearch} onFilterChange={setActiveFilter} onAddGoal={openCreateRoot} />

      {isEmpty ? (
        <EmptyState onCreateDream={openCreateRoot} />
      ) : outlineRows.length === 0 ? (
        <NoMatchState />
      ) : (
        <div className="space-y-5">
          <CustomizablePage pageId="goal-tree" title="Goal Tree Widgets" subtitle="Read-only goal progress and structure panels." sections={statsSections} availableWidgets={availableWidgets} />

          <GoalTreeSummaryCards
            dreams={typeCounts.dreams}
            goals={typeCounts.goals}
            milestones={typeCounts.milestones}
            progressGoals={typeCounts.progressGoals}
            overallProgress={summary.progress}
            activeFilter={activeFilter}
            onSelectFilter={handleSelectSummaryFilter}
          />

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.92fr)]">
            <div className="space-y-5 min-w-0">
              <GoalTreeTable
                rows={outlineRows}
                selectedNodeId={visibleSelectedNodeId}
                collapsedIds={collapsedIds}
                onSelectNode={setSelectedNodeId}
                onToggleCollapse={(nodeId) => {
                  setCollapsedIds((current) => {
                    const next = new Set(current);

                    if (next.has(nodeId)) {
                      next.delete(nodeId);
                    } else {
                      next.add(nodeId);
                    }

                    return next;
                  });
                }}
              />

              <TipBanner />
            </div>

            <GoalTreeDetailsPanel
              node={selectedNode}
              parentTitle={parentTitle}
              dreamTitle={dreamTitle}
              linkedQuests={linkedQuests}
              overview={activeFilterOverview}
              onEdit={openEdit}
              onAddChild={openAddChild}
              onDelete={handleDelete}
              onUpdateProgress={handleUpdateProgress}
              onAdvanceSequentialStep={completeSequentialStep}
              onUndoSequentialStep={undoSequentialStep}
              onEditQuest={openEditQuest}
              onDeleteQuest={deleteQuest}
              inheritedAttributeWeights={inheritedAttributeWeights}
            />
          </div>
        </div>
      )}

      {editorForm ? (
        <GoalNodeEditor
          mode={editorForm.id ? "edit" : "create"}
          form={editorForm}
          parentTitle={editorForm.parentId ? findOutlineParentTitle(visualTree, editorForm.parentId) : undefined}
          onChange={handleGoalNodeChange}
          onClose={() => setEditorForm(null)}
          onSave={saveGoalNode}
        />
      ) : null}

      {questForm ? (
        <QuestForm
          form={questForm}
          isEditing={Boolean(questForm.id)}
          onChange={setQuestForm}
          onCancel={() => setQuestForm(null)}
          onSave={saveQuest}
        />
      ) : null}

      {pendingChildParent ? (
        <GoalTreeChildTypeModal
          parentTitle={pendingChildParent.title}
          defaultChildType={getChildType(pendingChildParent.type)}
          onChoose={chooseChildType}
          onClose={closeChildTypePicker}
        />
      ) : null}
    </div>
  );
}
