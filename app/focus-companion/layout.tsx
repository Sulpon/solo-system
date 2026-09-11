import AppearanceProvider from "../(app)/_components/AppearanceProvider";
import { ProgressionProvider } from "../(app)/_lib/progression-store";
import { FocusProvider } from "../(app)/_lib/focus-store";

// A deliberately minimal sibling to (app)/layout.tsx - the Focus Companion
// is a small always-on-top window, not the full Atlas shell, so it mounts
// only the providers its UI actually reads from: AppearanceProvider (Atlas
// theme/accent), ProgressionProvider (Quest data, for useQuestCompletionFlow
// and useQuestExecutionSession), and FocusProvider (the Focus Session
// itself). No AppShell/Sidebar, no OnboardingGate, no CloudSync/Celebration/
// Workout providers - none of the Companion's UI needs them, and pulling
// them in would just be unused weight in a window meant to stay small.
//
// This still shares the exact same localStorage-backed state as the main
// window (same origin, same storage keys) - see
// _lib/desktop/focus-companion-window.ts for why that's enough for the two
// windows to stay in sync with no bespoke mechanism.
export default function FocusCompanionLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppearanceProvider>
      <ProgressionProvider>
        <FocusProvider>{children}</FocusProvider>
      </ProgressionProvider>
    </AppearanceProvider>
  );
}
