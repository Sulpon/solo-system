"use client";

import { useMemo, useState } from "react";
import Card from "../Card";
import CustomizablePage from "../page-edit/CustomizablePage";
import { StatNumberCard } from "../page-edit/StatWidgets";
import { getCatalogWidgetsForPage } from "../../_lib/widgets/catalog-registry";
import { useWorkoutTemplates } from "../../_lib/hooks/useWorkoutTemplates";
import { useWorkoutSessions } from "../../_lib/hooks/useWorkoutSessions";
import { useWorkout } from "../../_lib/workout-store";
import { getWeeklyVolume, getWorkoutStreak } from "../../_lib/engines/workout-engine";
import TemplateForm, { createEmptyTemplateForm, templateToForm, type TemplateFormModel } from "./TemplateForm";
import TemplateList from "./TemplateList";
import SessionHistoryList from "./SessionHistoryList";
import SessionDetailModal from "./SessionDetailModal";
import LogPastWorkoutModal from "./LogPastWorkoutModal";
import BodyweightPanel from "./BodyweightPanel";
import type { EditablePageSection } from "../page-edit/types";
import type { WorkoutSession, WorkoutTemplate } from "../../_lib/types/workout";

type WorkoutTab = "templates" | "history" | "body";

export default function WorkoutManagerPage() {
  const [tab, setTab] = useState<WorkoutTab>("templates");
  const { templates, setTemplates } = useWorkoutTemplates();
  const { sessions, setSessions } = useWorkoutSessions();
  const { startSession, activeSession, expand } = useWorkout();
  const [form, setForm] = useState<TemplateFormModel | null>(null);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [showLogPastWorkout, setShowLogPastWorkout] = useState(false);
  const availableWidgets = useMemo(() => getCatalogWidgetsForPage("workouts"), []);

  const statsSections = useMemo<EditablePageSection[]>(
    () => [
      {
        id: "workout-stats-overview",
        title: "Workout Overview",
        description: "Templates, weekly volume, and current streak.",
        size: "lg",
        readOnly: true,
        content: (
          <Card className="rounded-2xl border border-slate-800 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Workout Stats</p>
            <h2 className="mt-2 text-xl font-black text-white">Training overview</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Templates</p>
                <p className="mt-2 text-3xl font-black text-white">{templates.length}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Weekly Volume</p>
                <p className="mt-2 text-3xl font-black text-white">{getWeeklyVolume(sessions).toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Streak</p>
                <p className="mt-2 text-3xl font-black text-white">{getWorkoutStreak(sessions)}d</p>
              </div>
            </div>
          </Card>
        ),
      },
      {
        id: "workout-sessions-logged",
        title: "Sessions Logged",
        description: "Total workouts completed.",
        size: "md",
        readOnly: true,
        content: <StatNumberCard eyebrow="History" title="Sessions logged" value={sessions.length.toLocaleString()} description="Created when a workout is finished." accentClass="text-emerald-300" />,
      },
    ],
    [sessions, templates.length],
  );

  function saveTemplate(nextForm: TemplateFormModel) {
    if (!nextForm.title.trim()) {
      return;
    }

    const now = new Date().toISOString();

    if (nextForm.id) {
      setTemplates((current) => current.map((template) => (template.id === nextForm.id ? { ...template, title: nextForm.title, description: nextForm.description, exercises: nextForm.exercises, updatedAt: now } : template)));
    } else {
      const newTemplate: WorkoutTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: nextForm.title,
        description: nextForm.description,
        exercises: nextForm.exercises,
        createdAt: now,
        updatedAt: now,
      };
      setTemplates((current) => [...current, newTemplate]);
    }

    setForm(null);
  }

  function duplicateTemplate(template: WorkoutTemplate) {
    const now = new Date().toISOString();
    setTemplates((current) => [
      ...current,
      {
        ...template,
        id: `template-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: `${template.title} (Copy)`,
        createdAt: now,
        updatedAt: now,
      },
    ]);
  }

  function deleteTemplate(templateId: string) {
    setTemplates((current) => current.filter((template) => template.id !== templateId));
  }

  function handleStartWorkout() {
    if (activeSession) {
      expand();
      return;
    }

    startSession();
  }

  return (
    <div className="space-y-5">
      <CustomizablePage pageId="workouts" title="Workout Widgets" subtitle="Read-only workout statistics and progress panels." sections={statsSections} availableWidgets={availableWidgets} />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-300">Workout Manager</p>
            <h2 className="mt-2 text-2xl font-black text-white">Track your workouts</h2>
            <p className="mt-2 text-sm text-slate-400">Jump in and record what you did - no template required. Save one only if you want a shortcut for a routine you repeat.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={handleStartWorkout} className="rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25">
              {activeSession ? "Resume Workout" : "Start Workout"}
            </button>
            {tab === "templates" ? (
              <button type="button" onClick={() => setForm(createEmptyTemplateForm())} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
                Create Template
              </button>
            ) : null}
            {tab === "history" ? (
              <button type="button" onClick={() => setShowLogPastWorkout(true)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
                Log Past Workout
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {([
            { id: "templates", label: "Templates" },
            { id: "history", label: "History" },
            { id: "body", label: "Body" },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={
                "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] transition " +
                (tab === item.id ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-emerald-400/40 hover:text-white")
              }
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-5">
          {tab === "templates" ? (
            <TemplateList
              templates={templates}
              onStart={(template) => startSession({ templateId: template.id })}
              onEdit={(template) => setForm(templateToForm(template))}
              onDuplicate={duplicateTemplate}
              onDelete={deleteTemplate}
            />
          ) : null}
          {tab === "history" ? <SessionHistoryList sessions={sessions} onSelect={setSelectedSession} /> : null}
          {tab === "body" ? <BodyweightPanel /> : null}
        </div>

        {form ? <TemplateForm form={form} isEditing={Boolean(form.id)} onCancel={() => setForm(null)} onSave={saveTemplate} /> : null}
        {selectedSession ? <SessionDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} /> : null}
        {showLogPastWorkout ? (
          <LogPastWorkoutModal
            templates={templates}
            sessions={sessions}
            onClose={() => setShowLogPastWorkout(false)}
            onSave={(session) => {
              setSessions((current) => [...current, session]);
              setShowLogPastWorkout(false);
            }}
          />
        ) : null}
      </Card>
    </div>
  );
}
