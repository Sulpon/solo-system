"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { ChecklistTemplate } from "../types/checklist-template";

export function useChecklistTemplates() {
  const [templates, setTemplates, hasLoaded] = useLocalStorageState<ChecklistTemplate[]>(STORAGE_KEYS.checklistTemplates, []);

  return { templates, setTemplates, hasLoaded } as const;
}
