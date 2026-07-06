"use client";

import { useEffect, useState } from "react";
import QuestForm, { type QuestFormModel } from "../quests/QuestForm";
import { createQuestFormModel, upsertQuestFromForm } from "../quests/quest-form.utils";
import { buildDefaultAttributeWeights } from "../../_lib/goal-tree-attributes";
import { generateGoalNodeId } from "../../_lib/goal-tree-storage";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useProgression } from "../../_lib/hooks/useProgression";
import { pickRandomQuote } from "../../_lib/onboarding";
import type { Category, CategoryId } from "../../_lib/types/category";
import type { AttributeWeight, GoalNode } from "../../_lib/types/goal-tree";
import OnboardingLoadingTransition from "./OnboardingLoadingTransition";
import WelcomeStep from "./steps/WelcomeStep";
import AttributesStep from "./steps/AttributesStep";
import DreamStep from "./steps/DreamStep";
import WeightsStep from "./steps/WeightsStep";
import GoalStep, { type ChildKind } from "./steps/GoalStep";
import QuestStepIntro from "./steps/QuestStepIntro";
import FinishStep from "./steps/FinishStep";

type StepId = "welcome" | "attributes" | "dream" | "weights" | "goal" | "quest" | "finish";

type StepMeta = Readonly<{
  id: StepId;
  chapter: string;
  tagline: string;
}>;

// Chapter progression shown to the user: Welcome is a cold-open title card and
// isn't counted as a "chapter" in the progress indicator.
const STEP_META: ReadonlyArray<StepMeta> = [
  { id: "welcome", chapter: "Welcome", tagline: "" },
  { id: "attributes", chapter: "Identity", tagline: "Every hero is defined by their strengths." },
  { id: "dream", chapter: "Dreams", tagline: "Every legend starts with a vision." },
  { id: "weights", chapter: "Purpose", tagline: "Balance gives direction to ambition." },
  { id: "goal", chapter: "Goals", tagline: "The path reveals itself one step at a time." },
  { id: "quest", chapter: "Mission", tagline: "Every journey begins with a single mission." },
  { id: "finish", chapter: "Ready", tagline: "Your story starts now." },
];

const STEP_ORDER: StepId[] = STEP_META.map((meta) => meta.id);
const CHAPTERS = STEP_META.filter((meta) => meta.id !== "welcome");

type OnboardingWizardProps = Readonly<{
  onComplete: () => void;
}>;

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { attributes: savedAttributes, setAttributes: persistAttributes } = useAttributes();
  const { goalTree, createRootNode, createChildNode } = useGoalTree();
  const { questDefinitions, setQuestDefinitions } = useProgression();

  const [step, setStep] = useState<StepId>("welcome");
  const [history, setHistory] = useState<StepId[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);
  const [quote] = useState(() => pickRandomQuote());

  const [draftAttributes, setDraftAttributes] = useState<Category[]>(() => savedAttributes);

  const [dreamTitle, setDreamTitle] = useState("");
  const [dreamDescription, setDreamDescription] = useState("");
  const [dreamIcon, setDreamIcon] = useState("");
  const [dreamAttributeIds, setDreamAttributeIds] = useState<CategoryId[]>([]);
  const [dreamWeights, setDreamWeights] = useState<AttributeWeight[]>([]);
  const [dreamId, setDreamId] = useState<string | null>(null);

  const [goalTitle, setGoalTitle] = useState("");
  const [goalDescription, setGoalDescription] = useState("");
  const [childKind, setChildKind] = useState<ChildKind>("none");
  const [childTitle, setChildTitle] = useState("");
  const [childTargetValue, setChildTargetValue] = useState(100);
  const [childUnit, setChildUnit] = useState("");
  const [progressGoalId, setProgressGoalId] = useState<string | null>(null);

  const [questForm, setQuestForm] = useState<QuestFormModel | null>(null);
  const [questTitle, setQuestTitle] = useState("");

  function goToStep(next: StepId) {
    setHistory((current) => [...current, step]);
    setStep(next);
  }

  function goBack() {
    setHistory((current) => {
      if (current.length === 0) {
        return current;
      }

      const nextHistory = [...current];
      const previous = nextHistory.pop() as StepId;
      setStep(previous);
      return nextHistory;
    });
  }

  function advancePastGoal() {
    if (questDefinitions.length > 0) {
      setQuestTitle(questDefinitions[questDefinitions.length - 1].title);
      goToStep("finish");
      return;
    }

    goToStep("quest");
  }

  function advancePastDream(dreamNode: GoalNode) {
    const existingGoal = dreamNode.children.find((child) => child.type === "long_term_goal");

    if (existingGoal) {
      setGoalTitle(existingGoal.title);
      const existingProgressGoal = existingGoal.children.find((child) => child.type === "progress_goal");
      setProgressGoalId(existingProgressGoal?.id ?? null);
      advancePastGoal();
      return;
    }

    goToStep("goal");
  }

  function handleAttributesContinue() {
    persistAttributes(draftAttributes);
    const existingDream = goalTree.find((node) => node.type === "dream");

    if (existingDream) {
      setDreamId(existingDream.id);
      setDreamTitle(existingDream.title);
      setDreamAttributeIds(existingDream.attributes ?? []);
      setDreamWeights(existingDream.attributeWeights ?? []);
      advancePastDream(existingDream);
      return;
    }

    goToStep("dream");
  }

  function toggleDreamAttribute(attributeId: CategoryId) {
    setDreamAttributeIds((current) => (current.includes(attributeId) ? current.filter((id) => id !== attributeId) : [...current, attributeId]));
  }

  function handleDreamContinue() {
    setDreamWeights(buildDefaultAttributeWeights(dreamAttributeIds));
    goToStep("weights");
  }

  function handleWeightsContinue() {
    const id = generateGoalNodeId();
    const title = (dreamIcon.trim() ? `${dreamIcon.trim()} ` : "") + dreamTitle.trim();

    createRootNode({
      id,
      title,
      description: dreamDescription.trim(),
      type: "dream",
      status: "not_started",
      attributes: dreamAttributeIds,
      attributeWeights: dreamWeights,
    });

    setDreamId(id);
    setDreamTitle(title);
    goToStep("goal");
  }

  function handleGoalContinue() {
    if (!dreamId) {
      return;
    }

    const newGoalId = generateGoalNodeId();

    createChildNode(dreamId, {
      id: newGoalId,
      title: goalTitle.trim(),
      description: goalDescription.trim(),
      type: "long_term_goal",
      status: "not_started",
    });

    let newProgressGoalId: string | null = null;

    if (childKind === "milestone") {
      createChildNode(newGoalId, {
        title: childTitle.trim(),
        description: "",
        type: "milestone",
        status: "not_started",
      });
    } else if (childKind === "progress_goal") {
      newProgressGoalId = generateGoalNodeId();
      createChildNode(newGoalId, {
        id: newProgressGoalId,
        title: childTitle.trim(),
        description: "",
        type: "progress_goal",
        status: "not_started",
        currentValue: 0,
        targetValue: Math.max(1, childTargetValue),
        unit: childUnit.trim(),
      });
    }

    setProgressGoalId(newProgressGoalId);
    advancePastGoal();
  }

  useEffect(() => {
    if (step === "quest" && !questForm) {
      setQuestForm(
        createQuestFormModel({
          importance: "core",
          linkedProgressGoalId: progressGoalId,
          inheritedAttributeIds: dreamAttributeIds,
          inheritedAttributeWeights: dreamWeights,
          useInheritedAttributeDistribution: true,
        }),
      );
    }
  }, [step, questForm, progressGoalId, dreamAttributeIds, dreamWeights]);

  function resetQuestForm() {
    setQuestForm(
      createQuestFormModel({
        importance: "core",
        linkedProgressGoalId: progressGoalId,
        inheritedAttributeIds: dreamAttributeIds,
        inheritedAttributeWeights: dreamWeights,
        useInheritedAttributeDistribution: true,
      }),
    );
  }

  function handleSaveQuest() {
    if (!questForm || !questForm.title.trim()) {
      return;
    }

    setQuestDefinitions((current) => upsertQuestFromForm(current, questForm));
    setQuestTitle(questForm.title.trim());
    goToStep("finish");
  }

  function handleLaunch() {
    setIsLaunching(true);
  }

  if (isLaunching) {
    return <OnboardingLoadingTransition onDone={onComplete} />;
  }

  const stepIndex = STEP_ORDER.indexOf(step);
  const activeMeta = STEP_META[stepIndex] ?? STEP_META[0];
  const chapterIndex = CHAPTERS.findIndex((meta) => meta.id === step);
  const showChrome = step !== "welcome";

  return (
    <div className="onboarding-bg-glow relative min-h-screen overflow-hidden px-4 py-10">
      <div
        className="onboarding-bg-glow pointer-events-none absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(circle at ${20 + chapterIndex * 12}% 0%, rgba(88, 28, 135, 0.22), transparent 38rem), radial-gradient(circle at ${85 - chapterIndex * 8}% 15%, rgba(6, 182, 212, 0.12), transparent 32rem)`,
        }}
      />

      {history.length > 0 ? (
        <button
          type="button"
          onClick={goBack}
          className="fixed left-4 top-4 z-[60] flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/85 px-4 py-2 text-sm font-semibold text-slate-300 backdrop-blur transition hover:scale-[1.03] hover:border-purple-400/50 hover:text-white sm:left-6 sm:top-6"
        >
          ← Back
        </button>
      ) : null}

      <div className="mx-auto max-w-[760px]">
        {showChrome ? (
          <div key={`header-${step}`} className="onboarding-header-enter mb-10 text-center">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{activeMeta.chapter}</h1>
            <p className="mx-auto mt-3 max-w-md text-sm italic text-slate-400">{quote}</p>
          </div>
        ) : null}

        {showChrome ? (
          <div className="mb-10">
            <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-600">Character Creation</p>
            <div className="flex items-center" aria-label={`Chapter ${chapterIndex + 1} of ${CHAPTERS.length}: ${activeMeta.chapter}`}>
              {CHAPTERS.map((meta, index) => (
                <div key={meta.id} className="flex flex-1 items-center last:flex-none">
                  <div
                    className={
                      "flex h-3 w-3 shrink-0 items-center justify-center rounded-full border transition-all duration-300 " +
                      (index === chapterIndex
                        ? "onboarding-glow-pulse scale-125 border-purple-300 bg-purple-400"
                        : index < chapterIndex
                          ? "border-purple-400/70 bg-purple-400/70"
                          : "border-slate-700 bg-slate-900")
                    }
                  />
                  {index < CHAPTERS.length - 1 ? (
                    <div className={"mx-1 h-px flex-1 transition-colors duration-500 " + (index < chapterIndex ? "bg-purple-400/50" : "bg-slate-800")} />
                  ) : null}
                </div>
              ))}
            </div>
            <div className="mt-3 hidden items-start sm:flex">
              {CHAPTERS.map((meta, index) => (
                <div key={meta.id} className="flex-1 text-center last:flex-none last:w-6">
                  <span
                    className={
                      "text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors duration-300 " +
                      (index === chapterIndex ? "text-purple-200" : index < chapterIndex ? "text-slate-500" : "text-slate-700")
                    }
                  >
                    {meta.chapter}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-purple-500/20 bg-slate-950/60 p-6 shadow-[0_0_45px_rgba(88,28,135,0.18)] backdrop-blur-xl sm:p-10">
          <div key={step} className="onboarding-step-enter">
            {step === "welcome" ? <WelcomeStep onBegin={() => goToStep("attributes")} /> : null}

            {step === "attributes" ? (
              <AttributesStep attributes={draftAttributes} onChange={setDraftAttributes} onContinue={handleAttributesContinue} />
            ) : null}

            {step === "dream" ? (
              <DreamStep
                attributes={draftAttributes}
                title={dreamTitle}
                description={dreamDescription}
                icon={dreamIcon}
                selectedAttributeIds={dreamAttributeIds}
                onChangeTitle={setDreamTitle}
                onChangeDescription={setDreamDescription}
                onChangeIcon={setDreamIcon}
                onToggleAttribute={toggleDreamAttribute}
                onContinue={handleDreamContinue}
              />
            ) : null}

            {step === "weights" ? (
              <WeightsStep
                attributes={draftAttributes}
                selectedAttributeIds={dreamAttributeIds}
                weights={dreamWeights}
                onChangeWeights={setDreamWeights}
                onContinue={handleWeightsContinue}
              />
            ) : null}

            {step === "goal" ? (
              <GoalStep
                dreamTitle={dreamTitle}
                title={goalTitle}
                description={goalDescription}
                childKind={childKind}
                childTitle={childTitle}
                childTargetValue={childTargetValue}
                childUnit={childUnit}
                onChangeTitle={setGoalTitle}
                onChangeDescription={setGoalDescription}
                onChangeChildKind={setChildKind}
                onChangeChildTitle={setChildTitle}
                onChangeChildTargetValue={setChildTargetValue}
                onChangeChildUnit={setChildUnit}
                onContinue={handleGoalContinue}
              />
            ) : null}

            {step === "quest" ? <QuestStepIntro /> : null}

            {step === "finish" ? (
              <FinishStep attributes={draftAttributes} dreamTitle={dreamTitle} goalTitle={goalTitle} questTitle={questTitle} onLaunch={handleLaunch} />
            ) : null}
          </div>
        </div>
      </div>

      {step === "quest" && questForm ? (
        <QuestForm form={questForm} isEditing={false} onChange={setQuestForm} onCancel={resetQuestForm} onSave={handleSaveQuest} />
      ) : null}
    </div>
  );
}
