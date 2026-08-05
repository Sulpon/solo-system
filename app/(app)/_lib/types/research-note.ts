// A quick-capture log for anything research-related that isn't a formal
// experiment yet - ideas, questions, hypotheses, observations.

export type ResearchNoteType = "Idea" | "Question" | "Hypothesis" | "Observation";

export const RESEARCH_NOTE_TYPES: ReadonlyArray<ResearchNoteType> = ["Idea", "Question", "Hypothesis", "Observation"];

export type ResearchNoteEntry = Readonly<{
  id: string;
  type: ResearchNoteType;
  content: string;
}>;

export function createResearchNoteId() {
  return `research-note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createResearchNoteEntry(): ResearchNoteEntry {
  return { id: createResearchNoteId(), type: "Idea", content: "" };
}
