"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { DEFAULT_LINKEDIN_PROFILE } from "../types/linkedin-profile";
import type { LinkedInProfile } from "../types/linkedin-profile";

export function useLinkedInProfile() {
  const [profile, setProfile, hasLoaded] = useLocalStorageState<LinkedInProfile>(STORAGE_KEYS.linkedInProfile, DEFAULT_LINKEDIN_PROFILE);

  return { profile, setProfile, hasLoaded } as const;
}
