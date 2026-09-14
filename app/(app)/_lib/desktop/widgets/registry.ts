import type { FloatingWidgetDefinition, FloatingWidgetId } from "./types";

// Atlas Desktop Floating Widgets - the one typed table every other file in
// this module reads from (widget-manager.ts, the Settings toggle UI, the
// startup restorer). Adding a future widget means adding one entry here -
// nothing else in this directory should need a new hand-written branch.
//
// "focus" is DELIBERATELY the EXISTING Focus Companion (Milestone 2,
// _lib/desktop/focus-companion-window.ts / src-tauri/src/lib.rs's
// create_focus_companion_window), not a new window implementation -
// widget-manager.ts's create/show/hide functions special-case this one id
// to call the Companion's own existing functions rather than building a
// second, parallel window-creation path for the exact same window. It's
// registered here only so callers can list/toggle it through the same
// uniform API as the 3 widgets introduced this milestone. Its width/
// height/label below are for DISPLAY/lookup purposes only (matching
// focus-companion-window.ts's own constants) - the real window is still
// only ever created by that file's showFocusCompanionWindow().
export const FLOATING_WIDGET_REGISTRY: Readonly<Record<FloatingWidgetId, FloatingWidgetDefinition>> = {
  focus: {
    id: "focus",
    label: "focus-companion",
    title: "Atlas Focus",
    menuLabel: "Focus Companion",
    url: "/focus-companion",
    defaultWidth: 320,
    defaultHeight: 440,
    minWidth: 280,
    minHeight: 340,
    resizable: true,
    alwaysOnTop: true,
    stackIndex: 0,
  },
  "current-quest": {
    id: "current-quest",
    label: "widget-current-quest",
    title: "Atlas - Current Quest",
    menuLabel: "Current Quest Widget",
    url: "/widget/current-quest",
    defaultWidth: 300,
    defaultHeight: 160,
    minWidth: 240,
    minHeight: 120,
    resizable: true,
    alwaysOnTop: true,
    stackIndex: 1,
  },
  priority: {
    id: "priority",
    label: "widget-priority",
    title: "Atlas - Priority",
    menuLabel: "Priority Widget",
    url: "/widget/priority",
    defaultWidth: 260,
    defaultHeight: 140,
    minWidth: 220,
    minHeight: 110,
    resizable: true,
    alwaysOnTop: true,
    stackIndex: 2,
  },
  xp: {
    id: "xp",
    label: "widget-xp",
    title: "Atlas - XP",
    menuLabel: "XP Widget",
    url: "/widget/xp",
    defaultWidth: 260,
    defaultHeight: 120,
    minWidth: 220,
    minHeight: 100,
    resizable: true,
    alwaysOnTop: true,
    stackIndex: 3,
  },
};

export const FLOATING_WIDGET_IDS: ReadonlyArray<FloatingWidgetId> = ["focus", "current-quest", "priority", "xp"];

export function getWidgetDefinition(id: FloatingWidgetId): FloatingWidgetDefinition {
  return FLOATING_WIDGET_REGISTRY[id];
}
