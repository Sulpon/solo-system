"use client";

import { useEffect, useState } from "react";

// A tiny, shared reactive read of navigator.onLine - the same browser
// online/offline events cloud-sync-store.tsx already listens to for its own
// reconnect logic (see its "online" listener), just exposed as state any
// component can read instead of re-wiring the same two listeners again.
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
