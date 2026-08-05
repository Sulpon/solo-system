export type CoverLetterEntry = Readonly<{
  id: string;
  company: string;
  position: string;
  date: string;
  version: string;
  notes: string;
}>;

export function createCoverLetterId() {
  return `cover-letter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createCoverLetterEntry(company: string): CoverLetterEntry {
  return {
    id: createCoverLetterId(),
    company,
    position: "",
    date: "",
    version: "",
    notes: "",
  };
}

export const DEFAULT_COVER_LETTER_ENTRIES: ReadonlyArray<CoverLetterEntry> = [];
