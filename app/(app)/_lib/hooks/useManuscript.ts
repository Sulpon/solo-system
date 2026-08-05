"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_MANUSCRIPT } from "../types/manuscript";
import type { ManuscriptData } from "../types/manuscript";

export function useManuscript() {
  const [manuscript, setManuscript, hasLoaded] = useLocalStorageState<ManuscriptData>(STORAGE_KEYS.manuscriptChapters, DEFAULT_MANUSCRIPT);

  return { manuscript, setManuscript, hasLoaded } as const;
}
