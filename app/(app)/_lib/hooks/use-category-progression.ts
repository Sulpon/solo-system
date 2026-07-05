"use client";

import { useMemo } from "react";
import { useProgression } from "./useProgression";
import { getCategoryProgressionMap } from "../engines/progression-engine";
import { categories } from "../mock/categories";
import type { CategoryId } from "../types/category";

export function useCategoryProgression(categoryId: CategoryId) {
  const { isReady, questDefinitions, questCompletions, goalXpEvents } = useProgression();

  return useMemo(() => {
    const categoryMap = getCategoryProgressionMap(categories, questDefinitions, questCompletions, goalXpEvents);

    return {
      isReady,
      progression: categoryMap[categoryId] ?? null,
    };
  }, [categoryId, goalXpEvents, isReady, questCompletions, questDefinitions]);
}
