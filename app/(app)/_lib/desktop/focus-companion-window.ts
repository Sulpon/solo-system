"use client";

import { isDesktopApp } from "./is-desktop";

// The one place allowed to create/show/hide the Focus Companion's native
// Tauri window - see is-desktop.ts's isolation rule ("do not scatter
// window.__TAURI_INTERNALS__ or Tauri-specific implementation details
// through Atlas components"). Every export here is a safe no-op in the
// browser (isDesktopApp() guards it), so callers (QuestExecutionControl.tsx)
// never need their own Tauri-vs-browser branching.
//
// The Companion is a real second Tauri window loading /focus-companion -
// the SAME Next.js origin the main window already loads, which is exactly
// why it needs no bespoke state-sync mechanism: it mounts its own
// FocusProvider/ProgressionProvider, backed by the same localStorage keys,
// and the existing useLocalStorageState hook already listens for the
// browser's native "storage" event - which fires automatically in one
// same-origin window whenever another one writes to localStorage. See the
// Milestone 2 report for why this makes the Companion "just another
// interface to the existing execution state" rather than a second one.
const FOCUS_COMPANION_LABEL = "focus-companion";
const FOCUS_COMPANION_WIDTH = 320;
const FOCUS_COMPANION_HEIGHT = 440;
const FOCUS_COMPANION_MIN_WIDTH = 280;
const FOCUS_COMPANION_MIN_HEIGHT = 340;
// Keeps the window clear of the Windows taskbar and screen edge without
// needing a "get taskbar height" API this Tauri version doesn't expose.
const SCREEN_MARGIN_RIGHT = 24;
const SCREEN_MARGIN_BOTTOM = 60;

export async function showFocusCompanionWindow(): Promise<void> {
  if (!isDesktopApp()) {
    return;
  }

  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel(FOCUS_COMPANION_LABEL);

  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const { x, y } = await computeDefaultPosition();

  const companion = new WebviewWindow(FOCUS_COMPANION_LABEL, {
    url: "/focus-companion",
    title: "Atlas Focus",
    width: FOCUS_COMPANION_WIDTH,
    height: FOCUS_COMPANION_HEIGHT,
    minWidth: FOCUS_COMPANION_MIN_WIDTH,
    minHeight: FOCUS_COMPANION_MIN_HEIGHT,
    x,
    y,
    alwaysOnTop: true,
    decorations: false,
    resizable: true,
    skipTaskbar: true,
    shadow: true,
    visible: true,
    focus: true,
  });

  // Surfaces a creation failure (e.g. a missing capability/permission)
  // instead of leaving the caller waiting on a window that never appears.
  await new Promise<void>((resolve, reject) => {
    void companion.once("tauri://created", () => resolve());
    void companion.once("tauri://error", (event) => reject(new Error(String(event.payload))));
  });
}

export async function hideFocusCompanionWindow(): Promise<void> {
  if (!isDesktopApp()) {
    return;
  }

  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel(FOCUS_COMPANION_LABEL);
  await existing?.hide();
}

async function computeDefaultPosition(): Promise<{ x: number; y: number }> {
  try {
    const { primaryMonitor, availableMonitors } = await import("@tauri-apps/api/window");
    const monitor = (await primaryMonitor()) ?? (await availableMonitors())[0] ?? null;

    if (!monitor) {
      return { x: 0, y: 0 };
    }

    const logicalSize = monitor.size.toLogical(monitor.scaleFactor);
    const logicalPosition = monitor.position.toLogical(monitor.scaleFactor);

    return {
      x: Math.round(logicalPosition.x + logicalSize.width - FOCUS_COMPANION_WIDTH - SCREEN_MARGIN_RIGHT),
      y: Math.round(logicalPosition.y + logicalSize.height - FOCUS_COMPANION_HEIGHT - SCREEN_MARGIN_BOTTOM),
    };
  } catch {
    // A monitor lookup failing isn't worth blocking the window on - Tauri
    // falls back to its own default placement if x/y end up unset.
    return { x: 0, y: 0 };
  }
}
