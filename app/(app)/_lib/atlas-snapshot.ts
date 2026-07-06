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

export function applyAtlasSnapshot(snapshot: AtlasSnapshot) {
  const keysToRemove: string[] = [];

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (key && key.startsWith(ATLAS_KEY_PREFIX) && !(key in snapshot)) {
      keysToRemove.push(key);
    }
  }

  keysToRemove.forEach((key) => window.localStorage.removeItem(key));
  Object.entries(snapshot).forEach(([key, value]) => window.localStorage.setItem(key, value));

  window.dispatchEvent(new CustomEvent(MENACE_STORAGE_EVENT, { detail: {} }));
}
