// An Experiment is one self-contained piece of research work - its own
// objective, method, and conclusion, tracked independently so results from
// different experiments never get mixed together on one page.

export type ExperimentEntry = Readonly<{
  id: string;
  title: string;
  objective: string;
  method: string;
  results: string;
  interpretation: string;
  conclusion: string;
  nextSteps: string;
}>;

export function createExperimentId() {
  return `experiment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createExperimentEntry(): ExperimentEntry {
  return {
    id: createExperimentId(),
    title: "",
    objective: "",
    method: "",
    results: "",
    interpretation: "",
    conclusion: "",
    nextSteps: "",
  };
}
