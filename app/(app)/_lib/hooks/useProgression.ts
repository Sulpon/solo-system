"use client";

import { useContext } from "react";
import { ProgressionContext } from "../progression-store";

export function useProgression() {
  const context = useContext(ProgressionContext);

  if (!context) {
    throw new Error("useProgression must be used within a ProgressionProvider");
  }

  return context;
}
