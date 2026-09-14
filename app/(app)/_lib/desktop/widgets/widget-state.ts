import { STORAGE_KEYS } from "../../storage-keys";
import type { FloatingWidgetId } from "./types";

// Atlas Desktop Floating Widgets - persists which widgets were VISIBLE, so
// they can be restored on the next launch (see useWidgetRestoration.ts).
// tauri-plugin-window-state (already registered in src-tauri/src/lib.rs)
// persists each real window's POSITION/SIZE automatically for free - this
// is the one thing it doesn't cover, since a hidden window still exists
// (never destroyed) and a never-opened widget has no window to persist
// state for at all. Plain localStorage, the same convention every other
// small Atlas preference already uses - not a new persistence layer.
type WidgetVisibilityMap = Partial<Record<FloatingWidgetId, boolean>>;

function readMap(): WidgetVisibilityMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.desktopWidgetVisibility);
    return raw ? (JSON.parse(raw) as WidgetVisibilityMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: WidgetVisibilityMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS.desktopWidgetVisibility, JSON.stringify(map));
}

export function setWidgetVisible(id: FloatingWidgetId, visible: boolean): void {
  const map = readMap();
  map[id] = visible;
  writeMap(map);
}

export function isWidgetPersistedVisible(id: FloatingWidgetId): boolean {
  return readMap()[id] === true;
}

export function getPersistedVisibleWidgetIds(): FloatingWidgetId[] {
  const map = readMap();
  return (Object.keys(map) as FloatingWidgetId[]).filter((id) => map[id] === true);
}
