"use client";

import { isDesktopApp } from "../is-desktop";
import { showFocusCompanionWindow, hideFocusCompanionWindow } from "../focus-companion-window";
import { getWidgetDefinition, FLOATING_WIDGET_REGISTRY } from "./registry";
import { setWidgetVisible } from "./widget-state";
import type { FloatingWidgetId } from "./types";

// Atlas Desktop Floating Widgets - the one place allowed to create/show/
// hide a widget's real Tauri window, mirroring is-desktop.ts's isolation
// rule for the rest of _lib/desktop/: nothing outside this directory
// should import @tauri-apps/api/webviewWindow directly for a widget.
//
// "focus" is handled by DELEGATING to the EXISTING focus-companion-
// window.ts functions (Milestone 2) rather than re-implementing window
// creation for the same window under a second name - see registry.ts's
// own comment for why. The other 3 widgets share one small, generic
// implementation below, since they're genuinely new windows with no
// existing creator to reuse.

const MARGIN_RIGHT = 24;
const MARGIN_BOTTOM = 60;
const STACK_GAP = 16;

async function computePosition(id: FloatingWidgetId): Promise<{ x: number; y: number }> {
  const definition = getWidgetDefinition(id);

  try {
    const { primaryMonitor, availableMonitors } = await import("@tauri-apps/api/window");
    const monitor = (await primaryMonitor()) ?? (await availableMonitors())[0] ?? null;
    if (!monitor) return { x: 0, y: 0 };

    const logicalSize = monitor.size.toLogical(monitor.scaleFactor);
    const logicalPosition = monitor.position.toLogical(monitor.scaleFactor);

    // Stacks widgets upward from the bottom-right corner in registry
    // stackIndex order, so opening several at once doesn't pile them
    // exactly on top of each other - each widget still remembers its OWN
    // dragged-to position after that (tauri-plugin-window-state), this
    // only decides a sane FIRST-EVER placement. Kept in sync with the
    // equivalent algorithm in src-tauri/src/widgets.rs (used when the
    // TRAY creates a widget window instead of JS).
    const stackedOffset = Object.values(FLOATING_WIDGET_REGISTRY)
      .filter((other) => other.stackIndex < definition.stackIndex)
      .reduce((offset, other) => offset + other.defaultHeight + STACK_GAP, 0);

    return {
      x: Math.round(logicalPosition.x + logicalSize.width - definition.defaultWidth - MARGIN_RIGHT),
      y: Math.round(logicalPosition.y + logicalSize.height - definition.defaultHeight - MARGIN_BOTTOM - stackedOffset),
    };
  } catch {
    return { x: 0, y: 0 };
  }
}

async function createOrShowGenericWidgetWindow(id: FloatingWidgetId): Promise<void> {
  const definition = getWidgetDefinition(id);
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel(definition.label);

  if (existing) {
    await existing.show();
    await existing.setFocus();
    return;
  }

  const { x, y } = await computePosition(id);
  // Milestone 5 (Floating Widgets enable/show bug) - see the identical fix
  // and comment in focus-companion-window.ts: a bare relative route here
  // resolves against Tauri's own local bundled-asset protocol in a
  // RELEASE build (confirmed live - it rendered the frontend-dist-
  // placeholder stub, not the real widget). Must be an explicit absolute
  // URL against the real server this page itself was loaded from.
  const widgetWindow = new WebviewWindow(definition.label, {
    url: `${window.location.origin}${definition.url}`,
    title: definition.title,
    width: definition.defaultWidth,
    height: definition.defaultHeight,
    minWidth: definition.minWidth,
    minHeight: definition.minHeight,
    x,
    y,
    alwaysOnTop: definition.alwaysOnTop,
    decorations: false,
    resizable: definition.resizable,
    skipTaskbar: true,
    shadow: true,
    visible: true,
    focus: true,
  });

  await new Promise<void>((resolve, reject) => {
    void widgetWindow.once("tauri://created", () => resolve());
    void widgetWindow.once("tauri://error", (event) => reject(new Error(String(event.payload))));
  });

  // Milestone 6 (white-screen-after-enable bug) - `visible: true`/`focus:
  // true` in the constructor options above do NOT reliably result in an
  // actually-visible native window when the window is created via this
  // JS-invoked `plugin:webview|create_webview_window` IPC command -
  // confirmed live via real Win32 EnumWindows/IsWindowVisible inspection
  // of the compiled app: the window existed, with real loaded content
  // (confirmed via CDP), at the correct on-screen position, but
  // IsWindowVisible reported false - nothing was ever drawn. Calling
  // .show()/.setFocus() explicitly here (the exact same calls already
  // used above for an EXISTING window) reliably makes it visible -
  // confirmed live the same way. This mirrors Tauri's own guidance that a
  // freshly-created WebviewWindow's `visible` constructor option is not
  // guaranteed and an explicit .show() is the reliable path.
  await widgetWindow.show();
  await widgetWindow.setFocus();
}

async function hideGenericWidgetWindow(id: FloatingWidgetId): Promise<void> {
  const definition = getWidgetDefinition(id);
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel(definition.label);
  await existing?.hide();
}

export async function createOrShowWidgetWindow(id: FloatingWidgetId): Promise<void> {
  if (!isDesktopApp()) return;

  if (id === "focus") {
    await showFocusCompanionWindow();
  } else {
    await createOrShowGenericWidgetWindow(id);
  }

  setWidgetVisible(id, true);
}

export async function hideWidgetWindow(id: FloatingWidgetId): Promise<void> {
  if (!isDesktopApp()) return;

  if (id === "focus") {
    await hideFocusCompanionWindow();
  } else {
    await hideGenericWidgetWindow(id);
  }

  setWidgetVisible(id, false);
}

export async function isWidgetWindowVisible(id: FloatingWidgetId): Promise<boolean> {
  if (!isDesktopApp()) return false;

  const definition = getWidgetDefinition(id);
  const { WebviewWindow } = await import("@tauri-apps/api/webviewWindow");
  const existing = await WebviewWindow.getByLabel(definition.label);
  return existing ? await existing.isVisible() : false;
}

export async function toggleWidgetWindow(id: FloatingWidgetId): Promise<void> {
  if (!isDesktopApp()) return;

  if (await isWidgetWindowVisible(id)) {
    await hideWidgetWindow(id);
  } else {
    await createOrShowWidgetWindow(id);
  }
}
