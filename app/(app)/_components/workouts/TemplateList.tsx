"use client";

import type { WorkoutTemplate } from "../../_lib/types/workout";

type TemplateListProps = Readonly<{
  templates: ReadonlyArray<WorkoutTemplate>;
  onStart: (template: WorkoutTemplate) => void;
  onEdit: (template: WorkoutTemplate) => void;
  onDuplicate: (template: WorkoutTemplate) => void;
  onDelete: (templateId: string) => void;
}>;

export default function TemplateList({ templates, onStart, onEdit, onDuplicate, onDelete }: TemplateListProps) {
  if (templates.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <h3 className="text-lg font-bold text-white">No templates yet</h3>
        <p className="mt-2 text-sm text-slate-400">Templates are optional - use &ldquo;Start Workout&rdquo; above to log freely, or save a template if you repeat a routine and want to skip re-adding exercises each time.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <div key={template.id} className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950/55 p-4">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white">{template.title}</h3>
            {template.description ? <p className="mt-1 text-sm text-slate-400">{template.description}</p> : null}
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{template.exercises.length} exercise{template.exercises.length === 1 ? "" : "s"}</p>
            <ul className="mt-2 space-y-1">
              {template.exercises.slice(0, 4).map((exercise) => (
                <li key={exercise.id} className="truncate text-sm text-slate-300">
                  {exercise.name} <span className="text-slate-500">· {exercise.targetReps.length} × {exercise.targetReps.join("/")}</span>
                </li>
              ))}
              {template.exercises.length > 4 ? <li className="text-xs text-slate-500">+{template.exercises.length - 4} more</li> : null}
            </ul>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => onStart(template)} className="flex-1 rounded-xl border border-emerald-500/50 bg-emerald-500/15 px-3 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/25">
              Start Session
            </button>
            <button type="button" onClick={() => onEdit(template)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              Edit
            </button>
            <button type="button" onClick={() => onDuplicate(template)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              Duplicate
            </button>
            <button type="button" onClick={() => onDelete(template.id)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-rose-300 transition hover:border-rose-400/60">
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
