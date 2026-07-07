import AppShell from "./_components/AppShell";
import AppearanceProvider from "./_components/AppearanceProvider";
import CloudSyncUploadPrompt from "./_components/CloudSyncUploadPrompt";
import FocusOverlay from "./_components/focus/FocusOverlay";
import OnboardingGate from "./_components/onboarding/OnboardingGate";
import { CloudSyncProvider } from "./_lib/cloud-sync-store";
import { FocusProvider } from "./_lib/focus-store";
import { ProgressionProvider } from "./_lib/progression-store";

export default function MenaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <CloudSyncProvider>
      <AppearanceProvider>
        <ProgressionProvider>
          <FocusProvider>
            <OnboardingGate>
              <AppShell>{children}</AppShell>
              <CloudSyncUploadPrompt />
              <FocusOverlay />
            </OnboardingGate>
          </FocusProvider>
        </ProgressionProvider>
      </AppearanceProvider>
    </CloudSyncProvider>
  );
}
