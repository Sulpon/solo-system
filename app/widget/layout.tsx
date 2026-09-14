import AppearanceProvider from "../(app)/_components/AppearanceProvider";
import { ProgressionProvider } from "../(app)/_lib/progression-store";
import { FocusProvider } from "../(app)/_lib/focus-store";

// A deliberately minimal sibling to (app)/layout.tsx and focus-companion/
// layout.tsx (Milestone 2) - Atlas Desktop Floating Widgets are small
// always-on-top windows, not the full Atlas shell, so this mounts only the
// providers useAtlasContext() actually needs (ProgressionProvider,
// FocusProvider) plus AppearanceProvider for theme/accent. No AppShell/
// Sidebar/OnboardingGate/CloudSync/Celebration/Workout providers - none of
// the widget pages need them.
export default function WidgetLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <AppearanceProvider>
      <ProgressionProvider>
        <FocusProvider>{children}</FocusProvider>
      </ProgressionProvider>
    </AppearanceProvider>
  );
}
