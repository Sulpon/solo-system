"use client";

import { useWidgetRestoration } from "../../_lib/hooks/useWidgetRestoration";

// Renders nothing - mounted once at the app root (app/(app)/layout.tsx,
// alongside ProgressionEventSyncEffect/GoalMetricSyncEffect's identical
// pattern) so Atlas Desktop Floating Widgets that were open when the app
// last closed reopen automatically. A safe no-op in the browser
// (useWidgetRestoration itself is isDesktopApp()-gated).
export default function DesktopWidgetsBootstrap() {
  useWidgetRestoration();
  return null;
}
