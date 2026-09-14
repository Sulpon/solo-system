"use client";

import { useEffect, useRef } from "react";
import { isDesktopApp } from "../desktop/is-desktop";
import { getPersistedVisibleWidgetIds } from "../desktop/widgets/widget-state";
import { createOrShowWidgetWindow } from "../desktop/widgets/widget-manager";

// Atlas Desktop Floating Widgets - re-opens whichever widgets were visible
// when Atlas last closed. tauri-plugin-window-state restores a window's
// POSITION/SIZE automatically the moment it's (re)created, but nothing
// recreates the window itself - a widget the user had visible needs
// something to call createOrShowWidgetWindow again on the next launch, or
// it just silently doesn't come back (Section 3: "visibility persists
// after restart"). Runs once, mounted only in the main window (see
// DesktopWidgetsBootstrap.tsx / app/(app)/layout.tsx) - the widget windows
// themselves load routes outside the (app) layout, so this never re-fires
// inside a widget's own window.
export function useWidgetRestoration(): void {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current || !isDesktopApp()) return;
    hasRun.current = true;

    for (const id of getPersistedVisibleWidgetIds()) {
      void createOrShowWidgetWindow(id);
    }
  }, []);
}
