"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AppLauncher from "./shell/AppLauncher";
import Dock from "./shell/Dock";
import NotificationCenter from "./shell/NotificationCenter";
import ThemeBackground from "./theme/ThemeBackground";
import { useProgression } from "../_lib/hooks/useProgression";
import { useLocalStorageState } from "../_lib/hooks/use-local-storage-state";
import { useDomainThemeStyle } from "../_lib/hooks/useDomainTheme";
import { usePageBackdrop } from "../_lib/hooks/usePageBackdrop";
import { NOTIFICATIONS_LAST_SEEN_KEY } from "../_lib/storage-keys";

export default function AppShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isLauncherOpen, setIsLauncherOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { activityEvents } = useProgression();
  const [lastSeenAt] = useLocalStorageState<string | null>(NOTIFICATIONS_LAST_SEEN_KEY, null);
  // The ONE place a domain theme is selected. Derived from the pathname,
  // so deep links, refreshes and the Tauri build all resolve identically,
  // and an unknown route falls back to Home Base rather than rendering
  // unthemed.
  const { theme, style } = useDomainThemeStyle();
  const pathname = usePathname();
  // ThemeBackground sits at -z-10, and body carries its own gradient.
  // In CSS painting order a non-positioned block background paints ABOVE
  // negative-z descendants, so body veils that whole layer. Giving the
  // shell its own stacking context lifts the layer above body - applied
  // only while a wallpaper is shown, so every page without one looks
  // exactly as it did.
  const backdrop = usePageBackdrop();

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) {
      return 0;
    }

    const lastSeenMs = new Date(lastSeenAt).getTime();
    return activityEvents.filter((event) => new Date(event.createdAt).getTime() > lastSeenMs).length;
  }, [activityEvents, lastSeenAt]);

  return (
    <div data-domain={theme.id} style={backdrop ? { ...style, isolation: "isolate" } : style} className="relative flex min-h-screen flex-col text-white">
      <ThemeBackground />
      {/* The System Bar is a full-bleed sticky strip above everything else -
          a sibling of the Sidebar/main content, never a wrapper around it,
          so it can't interfere with any page's own scroll/drag containers
          (Dashboard's dnd-kit grid, Attributes' CustomizablePage reorder). */}
      <div className="sticky top-0 z-30 border-b border-[var(--atlas-border)] bg-black/55 px-4 backdrop-blur-xl md:px-6">
        <div className="mx-auto max-w-7xl pt-4">
          <TopBar
            onOpenMenu={() => setIsMobileNavOpen(true)}
            onOpenLauncher={() => setIsLauncherOpen(true)}
            onOpenNotifications={() => setIsNotificationsOpen(true)}
            unreadNotificationCount={unreadCount}
          />
        </div>
      </div>

      <div className="flex flex-1">
        <Sidebar isOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

        <main className="min-w-0 flex-1 p-4 pb-4 md:p-6 md:pb-24">
          {/* Keyed by pathname so each navigation plays the domain's enter
              transition at the domain's own speed. Next.js already unmounts
              page content on a route change, so this key costs no state
              that would otherwise have survived. Suppressed entirely under
              prefers-reduced-motion (see globals.css). */}
          <div key={pathname} className="atlas-page-enter mx-auto max-w-7xl space-y-6">
            {children}
          </div>
        </main>
      </div>

      <Dock onOpenLauncher={() => setIsLauncherOpen(true)} />
      {isLauncherOpen ? <AppLauncher onClose={() => setIsLauncherOpen(false)} /> : null}
      {isNotificationsOpen ? <NotificationCenter onClose={() => setIsNotificationsOpen(false)} /> : null}
    </div>
  );
}
