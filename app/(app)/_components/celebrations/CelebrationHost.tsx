"use client";

import { useEffect } from "react";
import { useCelebration } from "../../_lib/hooks/useCelebration";
import CelebrationCard from "./CelebrationCard";
import CelebrationModal from "./CelebrationModal";
import CelebrationToast from "./CelebrationToast";
import type { CelebrationIntensity } from "../../_lib/types/celebration";

const AUTO_DISMISS_MS: Partial<Record<CelebrationIntensity, number>> = {
  small: 3500,
  medium: 5000,
};

// Mounted once at the app root. Celebrations are a single FIFO queue (see
// celebration-store.tsx) rather than a parallel-stack, so small/medium
// celebrations auto-advance the queue on a timer while major/legendary ones
// wait for the user to dismiss - simple, and rare enough in practice that
// serializing them never feels like a bottleneck.
export default function CelebrationHost() {
  const { active, dismissActive } = useCelebration();

  useEffect(() => {
    if (!active) {
      return;
    }

    const duration = AUTO_DISMISS_MS[active.intensity];
    if (!duration) {
      return;
    }

    const timer = setTimeout(dismissActive, duration);
    return () => clearTimeout(timer);
  }, [active, dismissActive]);

  if (!active) {
    return null;
  }

  if (active.intensity === "small") {
    return <CelebrationToast celebration={active} onDismiss={dismissActive} />;
  }

  if (active.intensity === "medium") {
    return <CelebrationCard celebration={active} onDismiss={dismissActive} />;
  }

  return <CelebrationModal celebration={active} onDismiss={dismissActive} />;
}
