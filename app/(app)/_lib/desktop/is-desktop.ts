// The one place that knows how to detect "is Atlas currently running inside
// the Tauri desktop shell, or in an ordinary web browser." Nothing else in
// Atlas should reach for `window.__TAURI_INTERNALS__`/`@tauri-apps/api`
// directly - go through this module (and its future siblings, e.g. window
// utilities) instead, so Tauri-specific logic never scatters through
// regular feature components. See src-tauri/ for the desktop shell itself;
// Milestone 1 doesn't call any Tauri API yet, but this is the seam future
// desktop-only features (starting with the Focus Companion window) will
// hang off.
//
// Tauri's webview injects `window.__TAURI_INTERNALS__` into every page it
// loads - it is never present in a normal browser tab, and this file is
// the only place that string is allowed to appear.
export function isDesktopApp(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__);
}
