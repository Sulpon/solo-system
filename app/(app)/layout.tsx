import AppShell from "./_components/AppShell";
import AppearanceProvider from "./_components/AppearanceProvider";
import { ProgressionProvider } from "./_lib/progression-store";

export default function MenaceLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppearanceProvider>
      <ProgressionProvider>
        <AppShell>{children}</AppShell>
      </ProgressionProvider>
    </AppearanceProvider>
  );
}
