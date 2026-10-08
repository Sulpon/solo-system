import { MENACE_STORAGE_EVENT } from "./storage-keys";

const ATLAS_KEY_PREFIX = "menace-";

export type AtlasSnapshot = Record<string, string>;

export function collectAtlasSnapshot(): AtlasSnapshot {
  const snapshot: AtlasSnapshot = {};

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith(ATLAS_KEY_PREFIX)) {
      continue;
    }

    const value = window.localStorage.getItem(key);

    if (value !== null) {
      snapshot[key] = value;
    }
  }

  return snapshot;
}

export function hasAnyAtlasData(): boolean {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(ATLAS_KEY_PREFIX)) {
      return true;
    }
  }

  return false;
}

// How an incoming snapshot is applied to local storage.
//
// "replace" makes local storage MATCH the snapshot: any menace-* key not
// in it is deleted. That is correct for an explicit, user-confirmed
// restore ("make this device look like my backup") and wrong for anything
// else.
//
// "merge" only ever writes: no key is removed, so a snapshot that is
// missing something cannot delete it. Cloud hydration uses this
// unconditionally - a cloud row that is empty, truncated, or belongs to a
// half-initialised project must never be able to empty this device.
//
// The parameter is deliberately REQUIRED rather than defaulted: every call
// site has to state which semantics it wants, so the destructive one can
// never be selected by omission.
export type SnapshotApplyMode = "replace" | "merge";

export function applyAtlasSnapshot(snapshot: AtlasSnapshot, mode: SnapshotApplyMode) {
  if (mode === "replace") {
    const keysToRemove: string[] = [];

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);

      if (key && key.startsWith(ATLAS_KEY_PREFIX) && !(key in snapshot)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  }

  Object.entries(snapshot).forEach(([key, value]) => window.localStorage.setItem(key, value));

  window.dispatchEvent(new CustomEvent(MENACE_STORAGE_EVENT, { detail: {} }));
}
