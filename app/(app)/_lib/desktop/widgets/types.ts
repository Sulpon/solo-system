// Atlas Desktop Floating Widgets - shared types. See registry.ts for why
// "focus" is not a new implementation but the EXISTING Focus Companion
// (Milestone 2), registered here purely so it can be listed/toggled
// through the same uniform API as the widgets introduced this milestone.
export type FloatingWidgetId = "focus" | "current-quest" | "priority" | "xp";

export type FloatingWidgetDefinition = Readonly<{
  id: FloatingWidgetId;
  // The real Tauri window label - MUST match a window label in
  // src-tauri/src/widgets.rs (or lib.rs's Focus Companion constants) and
  // in capabilities/default.json's `windows` scope, or window creation/
  // show/hide silently fails against the ACL.
  label: string;
  title: string;
  menuLabel: string;
  // The Next.js route this window loads - always same-origin (the same
  // running Atlas server every other window already loads), never an
  // external URL.
  url: string;
  defaultWidth: number;
  defaultHeight: number;
  minWidth: number;
  minHeight: number;
  resizable: boolean;
  alwaysOnTop: boolean;
  // Stacking order for a first-ever (never-before-positioned) placement -
  // see widget-manager.ts's computePosition. Not a z-order/display-order
  // concept, purely "how far up from the bottom-right corner."
  stackIndex: number;
}>;
