"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_PORTFOLIO_PROFILE } from "../types/portfolio-profile";
import type { PortfolioProfile } from "../types/portfolio-profile";

export function usePortfolioProfile() {
  const [profile, setProfile, hasLoaded] = useLocalStorageState<PortfolioProfile>(STORAGE_KEYS.portfolioProfile, DEFAULT_PORTFOLIO_PROFILE);

  return { profile, setProfile, hasLoaded } as const;
}
