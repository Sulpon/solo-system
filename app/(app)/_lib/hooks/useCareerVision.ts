"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_CAREER_VISION } from "../types/career-vision";
import type { CareerVisionData } from "../types/career-vision";

export function useCareerVision() {
  const [careerVision, setCareerVision, hasLoaded] = useLocalStorageState<CareerVisionData>(STORAGE_KEYS.careerVision, DEFAULT_CAREER_VISION);

  return { careerVision, setCareerVision, hasLoaded } as const;
}
