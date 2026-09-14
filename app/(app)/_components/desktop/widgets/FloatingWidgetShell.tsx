"use client";

import { useEffect } from "react";
import { isDesktopApp } from "../../../_lib/desktop/is-desktop";
import { hideWidgetWindow } from "../../../_lib/desktop/widgets/widget-manager";
import type { FloatingWidgetId } from "../../../_lib/desktop/widgets/types";

type FloatingWidgetShellProps = Readonly<{
  widgetId: FloatingWidgetId;
  label: string;
  children: React.ReactNode;
}>;

// Shared chrome for the 3 new floating widgets (current-quest/priority/xp)
// - generalizes app/focus-companion/page.tsx's own header/drag-region/
// close-button/close-request pattern (Milestone 2) rather than a second,
// slightly-different implementation. The Focus Companion itself keeps its
// own bespoke header (it has its own close semantics tied to the Quest
// execution session) - this is only for the widgets that don't need
// anything beyond "drag to move, click x to hide."
export default function FloatingWidgetShell({ widgetId, label, children }: FloatingWidgetShellProps) {
  // A manual close (Alt+F4, etc.) must hide the window, not destroy it -
  // reopening later (tray, restart restoration) needs the window to still
  // exist under its label. Mirrors FocusCompanionPage's identical effect.
  useEffect(() => {
    if (!isDesktopApp()) return;

    let unlisten: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const off = await getCurrentWindow().onCloseRequested((event) => {
        event.preventDefault();
        void hideWidgetWindow(widgetId);
      });

      if (cancelled) {
        off();
      } else {
        unlisten = off;
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [widgetId]);

  return (
    <div data-tauri-drag-region className="flex h-screen w-screen flex-col overflow-hidden bg-slate-950 text-white">
      <div data-tauri-drag-region className="flex shrink-0 items-center justify-between border-b border-slate-800 px-3 py-2">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-purple-200">
          <span aria-hidden="true">△</span> {label}
        </span>
        {isDesktopApp() ? (
          <button
            type="button"
            onClick={() => void hideWidgetWindow(widgetId)}
            aria-label={`Close ${label}`}
            className="flex h-5 w-5 items-center justify-center rounded text-slate-500 transition hover:bg-slate-800 hover:text-white"
          >
            ×
          </button>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">{children}</div>
    </div>
  );
}
