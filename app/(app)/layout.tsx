import AppShell from "./_components/AppShell";
import AppearanceProvider from "./_components/AppearanceProvider";
import CloudSyncUploadPrompt from "./_components/CloudSyncUploadPrompt";
import FocusOverlay from "./_components/focus/FocusOverlay";
import ActiveWorkoutOverlay from "./_components/workouts/ActiveWorkoutOverlay";
import OnboardingGate from "./_components/onboarding/OnboardingGate";
import { CloudSyncProvider } from "./_lib/cloud-sync-store";
import { FocusProvider } from "./_lib/focus-store";
import { ProgressionProvider } from "./_lib/progression-store";
import { WorkoutProvider } from "./_lib/workout-store";

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
            <WorkoutProvider>
              <OnboardingGate>
                <AppShell>{children}</AppShell>
                <CloudSyncUploadPrompt />
                <FocusOverlay />
                <ActiveWorkoutOverlay />
              </OnboardingGate>
            </WorkoutProvider>
          </FocusProvider>
        </ProgressionProvider>
      </AppearanceProvider>
    </CloudSyncProvider>
  );
}
