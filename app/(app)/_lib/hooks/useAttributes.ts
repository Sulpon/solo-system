"use client";

import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import type { Category } from "../types/category";

export function useAttributes() {
  const [attributes, setAttributes, hasLoaded, resetAttributes] = useLocalStorageState<Category[]>(STORAGE_KEYS.attributes, []);

  return { attributes, setAttributes, hasLoaded, resetAttributes } as const;
}
