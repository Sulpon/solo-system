// The Manuscript is the actual thesis document, split into a fixed set of
// chapters - not a user-managed list like Experiments, since chapters aren't
// created or deleted, only written. Research notes/findings live elsewhere
// (see research-note.ts, finding.ts) so this stays focused on writing only.

export type ManuscriptChapterKey = "outline" | "introduction" | "literatureReview" | "methodology" | "results" | "discussion" | "conclusion";

export const MANUSCRIPT_CHAPTER_ORDER: ReadonlyArray<ManuscriptChapterKey> = [
  "outline",
  "introduction",
  "literatureReview",
  "methodology",
  "results",
  "discussion",
  "conclusion",
];

export const MANUSCRIPT_CHAPTER_TITLES: Record<ManuscriptChapterKey, string> = {
  outline: "Outline",
  introduction: "Introduction",
  literatureReview: "Literature Review",
  methodology: "Methodology",
  results: "Results",
  discussion: "Discussion",
  conclusion: "Conclusion",
};

export type ManuscriptChapterStatus = "Not Started" | "Drafting" | "In Review" | "Final";

export const MANUSCRIPT_CHAPTER_STATUSES: ReadonlyArray<ManuscriptChapterStatus> = ["Not Started", "Drafting", "In Review", "Final"];

export type ManuscriptChapter = Readonly<{
  draft: string;
  status: ManuscriptChapterStatus;
  notes: string;
  reviewerComments: string;
  // Optional - entries written before this field existed simply omit it.
  targetPages?: number;
}>;

// Status is the only signal we have for chapter completion (there's no
// per-chapter page-output tracking, only the thesis-wide daily writing log),
// so this heuristic maps status to a rough progress percentage.
export const MANUSCRIPT_CHAPTER_STATUS_PROGRESS: Record<ManuscriptChapterStatus, number> = {
  "Not Started": 0,
  Drafting: 40,
  "In Review": 75,
  Final: 100,
};

export type ManuscriptData = Readonly<Record<ManuscriptChapterKey, ManuscriptChapter>>;

const DEFAULT_MANUSCRIPT_CHAPTER: ManuscriptChapter = { draft: "", status: "Not Started", notes: "", reviewerComments: "" };

export const DEFAULT_MANUSCRIPT: ManuscriptData = MANUSCRIPT_CHAPTER_ORDER.reduce((data, key) => ({ ...data, [key]: DEFAULT_MANUSCRIPT_CHAPTER }), {} as ManuscriptData);

export function isManuscriptChapterKey(value: string): value is ManuscriptChapterKey {
  return (MANUSCRIPT_CHAPTER_ORDER as ReadonlyArray<string>).includes(value);
}
