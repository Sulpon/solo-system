"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_COMPANY_ENTRIES } from "../types/company-database";
import type { CompanyEntry } from "../types/company-database";

// Entries written before the Company/Vacancy split may still carry the old
// `researchNotes` field instead of `notes` - fall back to it in memory only,
// never written back to storage in the old shape.
function normalizeCompanyEntry(entry: CompanyEntry & { researchNotes?: string }): CompanyEntry {
  return entry.notes ? entry : { ...entry, notes: entry.researchNotes || "" };
}

export function useCompanyEntries() {
  const [entries, setEntries, hasLoaded] = useLocalStorageState<CompanyEntry[]>(STORAGE_KEYS.companyEntries, [...DEFAULT_COMPANY_ENTRIES]);

  return { entries: entries.map(normalizeCompanyEntry), setEntries, hasLoaded } as const;
}
