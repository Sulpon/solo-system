"use client";

import { useRouter } from "next/navigation";
import Card from "../Card";
import ThesisHubBackLink from "./ThesisHubBackLink";
import ExperimentCard from "./ExperimentCard";
import ResearchNoteList from "./ResearchNoteList";
import FindingList from "./FindingList";
import ResourceList from "./ResourceList";
import { useExperimentEntries } from "../../_lib/hooks/useExperimentEntries";
import { useResearchNoteEntries } from "../../_lib/hooks/useResearchNoteEntries";
import { useFindingEntries } from "../../_lib/hooks/useFindingEntries";
import { useResourceEntries } from "../../_lib/hooks/useResourceEntries";
import { createExperimentEntry } from "../../_lib/types/experiment";

const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

export default function ThesisResearchPageClient() {
  const router = useRouter();
  const { entries: experiments, setEntries: setExperiments, hasLoaded: experimentsLoaded } = useExperimentEntries();
  const { entries: notes, setEntries: setNotes, hasLoaded: notesLoaded } = useResearchNoteEntries();
  const { entries: findings, setEntries: setFindings, hasLoaded: findingsLoaded } = useFindingEntries();
  const { entries: resources, setEntries: setResources, hasLoaded: resourcesLoaded } = useResourceEntries();

  if (!experimentsLoaded || !notesLoaded || !findingsLoaded || !resourcesLoaded) {
    return null;
  }

  function addExperiment() {
    const experiment = createExperimentEntry();
    setExperiments((current) => [...current, experiment]);
    router.push(`/thesis-hub/research/experiments/${experiment.id}`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <ThesisHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Thesis Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">🔬 Research</h1>
        <p className="mt-2 text-sm text-slate-400">Everything related to research and experimentation.</p>
      </div>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={sectionLabelClass}>Experiments</p>
          <button type="button" onClick={addExperiment} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Add Experiment
          </button>
        </div>
        {experiments.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {experiments.map((experiment) => (
              <ExperimentCard key={experiment.id} experiment={experiment} />
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-5 text-center text-sm text-slate-400">
            No experiments yet. Add one to start tracking objective, method, and results.
          </div>
        )}
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Research Notes</p>
        <p className="mt-2 text-sm text-slate-400">Ideas, questions, hypotheses, and observations.</p>
        <div className="mt-4">
          <ResearchNoteList entries={notes} onChange={setNotes} />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Findings</p>
        <p className="mt-2 text-sm text-slate-400">Important conclusions that may later be included in the thesis.</p>
        <div className="mt-4">
          <FindingList entries={findings} onChange={setFindings} />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Resources</p>
        <p className="mt-2 text-sm text-slate-400">Papers, references, useful links, PDFs, and meeting notes.</p>
        <div className="mt-4">
          <ResourceList entries={resources} onChange={setResources} />
        </div>
      </Card>
    </div>
  );
}
