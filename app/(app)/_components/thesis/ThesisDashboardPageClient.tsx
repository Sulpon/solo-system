"use client";

import Card from "../Card";
import ThesisHubBackLink from "./ThesisHubBackLink";
import EditableStringList from "../EditableStringList";
import ThesisTimelineList from "./ThesisTimelineList";
import { useThesisDashboard } from "../../_lib/hooks/useThesisDashboard";
import type { ThesisCurrentFocus, ThesisInfo } from "../../_lib/types/thesis-dashboard";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function ProgressBar({ label, value }: Readonly<{ label: string; value: number }>) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/5">
        <div className="h-full bg-purple-500 shadow-[0_0_18px_rgba(168,85,247,0.45)]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

const currentFocusFields: ReadonlyArray<{ key: keyof ThesisCurrentFocus; label: string; placeholder: string }> = [
  { key: "currentTask", label: "Current Task", placeholder: "What you're working on right now" },
  { key: "nextMilestone", label: "Next Milestone", placeholder: "What's coming up next" },
  { key: "currentBottleneck", label: "Current Bottleneck", placeholder: "What's slowing you down, if anything" },
];

export default function ThesisDashboardPageClient() {
  const { dashboard, setDashboard, hasLoaded } = useThesisDashboard();

  if (!hasLoaded) {
    return null;
  }

  function updateInfo(key: keyof ThesisInfo, value: string) {
    setDashboard((current) => ({ ...current, info: { ...current.info, [key]: value } }));
  }

  function updateFocus(key: keyof ThesisCurrentFocus, value: string) {
    setDashboard((current) => ({ ...current, currentFocus: { ...current.currentFocus, [key]: value } }));
  }

  const overall = clampPercent((dashboard.progress.research + dashboard.progress.writing) / 2);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <ThesisHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Thesis Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">📊 Dashboard</h1>
        <p className="mt-2 text-sm text-slate-400">A quick overview of the whole thesis - not a place to work, just to check in.</p>
      </div>

      <Card className="p-5">
        <p className={sectionLabelClass}>Thesis Information</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Thesis Title</span>
            <input value={dashboard.info.title} onChange={(event) => updateInfo("title", event.target.value)} className={inputClass} placeholder="Your thesis title" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Research Question</span>
            <textarea
              value={dashboard.info.researchQuestion}
              onChange={(event) => updateInfo("researchQuestion", event.target.value)}
              className={inputClass + " min-h-20"}
              placeholder="The central question your thesis answers"
            />
          </label>
          <div className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Supervisor(s)</span>
            <EditableStringList items={dashboard.info.supervisors} onChange={(next) => setDashboard((current) => ({ ...current, info: { ...current.info, supervisors: next } }))} placeholder="Add a supervisor" />
          </div>
          <label className="space-y-2">
            <span className={labelClass}>Expected Graduation</span>
            <input value={dashboard.info.expectedGraduation} onChange={(event) => updateInfo("expectedGraduation", event.target.value)} className={inputClass} placeholder="e.g. November 2026" />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Progress</p>
        <div className="mt-4 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className={labelClass}>Research (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={dashboard.progress.research}
                onChange={(event) => setDashboard((current) => ({ ...current, progress: { ...current.progress, research: clampPercent(Number(event.target.value)) } }))}
                className={inputClass}
              />
            </label>
            <label className="space-y-2">
              <span className={labelClass}>Writing (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={dashboard.progress.writing}
                onChange={(event) => setDashboard((current) => ({ ...current, progress: { ...current.progress, writing: clampPercent(Number(event.target.value)) } }))}
                className={inputClass}
              />
            </label>
          </div>
          <div className="space-y-4">
            <ProgressBar label="Research" value={dashboard.progress.research} />
            <ProgressBar label="Writing" value={dashboard.progress.writing} />
            <ProgressBar label="Overall Thesis" value={overall} />
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Current Focus</p>
        <div className="mt-4 grid gap-4">
          {currentFocusFields.map((field) => (
            <label key={field.key} className="space-y-2">
              <span className={labelClass}>{field.label}</span>
              <input value={dashboard.currentFocus[field.key]} onChange={(event) => updateFocus(field.key, event.target.value)} className={inputClass} placeholder={field.placeholder} />
            </label>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Timeline</p>
        <p className="mt-2 text-sm text-slate-400">Important milestones and upcoming deadlines, sorted by date.</p>
        <div className="mt-4">
          <ThesisTimelineList items={dashboard.timeline} onChange={(next) => setDashboard((current) => ({ ...current, timeline: next }))} />
        </div>
      </Card>
    </div>
  );
}
