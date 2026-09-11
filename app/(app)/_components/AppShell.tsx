"use client";

import { useMemo, useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AppLauncher from "./shell/AppLauncher";
import Dock from "./shell/Dock";
import NotificationCenter from "./shell/NotificationCenter";
import { useProgression } from "../_lib/hooks/useProgression";
import { useLocalStorageState } from "../_lib/hooks/use-local-storage-state";
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

  const unreadCount = useMemo(() => {
    if (!lastSeenAt) {
      return 0;
    }

    const lastSeenMs = new Date(lastSeenAt).getTime();
    return activityEvents.filter((event) => new Date(event.createdAt).getTime() > lastSeenMs).length;
  }, [activityEvents, lastSeenAt]);

  return (
    <div className="menace-shell flex min-h-screen flex-col text-white">
      {/* The System Bar is a full-bleed sticky strip above everything else -
          a sibling of the Sidebar/main content, never a wrapper around it,
          so it can't interfere with any page's own scroll/drag containers
          (Dashboard's dnd-kit grid, Attributes' CustomizablePage reorder). */}
      <div className="sticky top-0 z-30 bg-slate-950/90 px-4 backdrop-blur-xl md:px-6">
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
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>

      <Dock onOpenLauncher={() => setIsLauncherOpen(true)} />
      {isLauncherOpen ? <AppLauncher onClose={() => setIsLauncherOpen(false)} /> : null}
      {isNotificationsOpen ? <NotificationCenter onClose={() => setIsNotificationsOpen(false)} /> : null}
    </div>
  );
}
