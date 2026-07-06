import AppShell from "./_components/AppShell";
import AppearanceProvider from "./_components/AppearanceProvider";
import CloudSyncUploadPrompt from "./_components/CloudSyncUploadPrompt";
import OnboardingGate from "./_components/onboarding/OnboardingGate";
import { CloudSyncProvider } from "./_lib/cloud-sync-store";
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
          <OnboardingGate>
            <AppShell>{children}</AppShell>
            <CloudSyncUploadPrompt />
          </OnboardingGate>
        </ProgressionProvider>
      </AppearanceProvider>
    </CloudSyncProvider>
  );
}
