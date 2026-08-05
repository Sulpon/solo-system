// A CV is a targeted variant of the same underlying career story - it never
// duplicates Education/Experience/Skill content, it just selects which
// Profile Database entries (see profile-database.ts) that variant leads
// with. Edit the source entry once and every CV that references it stays
// current.

// Metadata only - the actual file bytes live in IndexedDB (see
// document-store.ts), keyed by this same id, so a CV entry in localStorage
// never carries real file weight.
export type CvDocument = Readonly<{
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}>;

export type CvEntry = Readonly<{
  id: string;
  name: string;
  targetMarket: string;
  targetRoles: ReadonlyArray<string>;
  lastUpdated: string;
  notes: string;
  includedEducationIds: ReadonlyArray<string>;
  includedExperienceIds: ReadonlyArray<string>;
  includedSkillIds: ReadonlyArray<string>;
  documents: ReadonlyArray<CvDocument>;
}>;

export function createCvId() {
  return `cv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCvDocumentId() {
  return `cv-document-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCvEntry(name: string): CvEntry {
  return {
    id: createCvId(),
    name,
    targetMarket: "",
    targetRoles: [],
    lastUpdated: "",
    notes: "",
    includedEducationIds: [],
    includedExperienceIds: [],
    includedSkillIds: [],
    documents: [],
  };
}

export const DEFAULT_CV_ENTRIES: ReadonlyArray<CvEntry> = [];
