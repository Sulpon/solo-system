"use client";

import { useMemo } from "react";
import { useAttributes } from "./useAttributes";
import { useProgression } from "./useProgression";
import { getCategoryProgressionMap } from "../engines/progression-engine";
import type { CategoryId } from "../types/category";

export function useCategoryProgression(categoryId: CategoryId) {
  const { isReady, questDefinitions, questCompletions, goalXpEvents } = useProgression();
  const { attributes } = useAttributes();

  return useMemo(() => {
    const categoryMap = getCategoryProgressionMap(attributes, questDefinitions, questCompletions, goalXpEvents);

    return {
      isReady,
      progression: categoryMap[categoryId] ?? null,
    };
  }, [attributes, categoryId, goalXpEvents, isReady, questCompletions, questDefinitions]);
}
