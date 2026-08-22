"use client";

import { useContext } from "react";
import { CelebrationContext } from "../celebration-store";

export function useCelebration() {
  const context = useContext(CelebrationContext);

  if (!context) {
    throw new Error("useCelebration must be used within a CelebrationProvider");
  }

  return context;
}
