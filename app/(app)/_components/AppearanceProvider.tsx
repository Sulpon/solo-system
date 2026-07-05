"use client";

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { defaultAppearanceSettings } from "../_lib/mock/customization";
import { STORAGE_KEYS } from "../_lib/storage-keys";
import { useLocalStorageState } from "../_lib/hooks/use-local-storage-state";
import type { AppearanceSettings } from "../_lib/types/customization";

const accentValues: Record<AppearanceSettings["accentColor"], string> = {
  purple: "168 85 247",
  blue: "56 189 248",
  green: "52 211 153",
  orange: "251 146 60",
};

const radiusValues: Record<AppearanceSettings["cornerRadius"], string> = {
  compact: "0.5rem",
  comfortable: "0.875rem",
  rounded: "1rem",
};

const densityValues: Record<AppearanceSettings["density"], string> = {
  compact: "0.85",
  normal: "1",
  spacious: "1.15",
};

export default function AppearanceProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [appearance] = useLocalStorageState<AppearanceSettings>(STORAGE_KEYS.appearance, defaultAppearanceSettings);

  const style = useMemo(
    () =>
      ({
        "--menace-accent": accentValues[appearance.accentColor],
        "--menace-radius": radiusValues[appearance.cornerRadius],
        "--menace-density": densityValues[appearance.density],
      }) as CSSProperties,
    [appearance],
  );

  return (
    <div data-theme={appearance.theme} data-density={appearance.density} style={style} className="min-h-screen">
      {children}
    </div>
  );
}
