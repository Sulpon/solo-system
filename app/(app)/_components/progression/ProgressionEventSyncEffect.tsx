"use client";

import { useProgressionEventSync } from "../../_lib/hooks/useProgressionEventSync";

// Renders nothing - mounted once at the app root so level-ups, streak
// milestones, and achievements are detected no matter which page the user
// is on (see useProgressionEventSync.ts).
export default function ProgressionEventSyncEffect() {
  useProgressionEventSync();
  return null;
}
