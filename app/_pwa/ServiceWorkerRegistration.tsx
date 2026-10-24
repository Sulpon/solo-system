"use client";

import { useEffect } from "react";
import { isDesktopApp } from "../(app)/_lib/desktop/is-desktop";

// Registers the offline worker, in the browser only.
//
// Deliberately skipped inside the Tauri shell: the desktop build serves
// the app from its own bundled Node server, and putting a cache in front
// of that would only add a way for the desktop app to serve something
// stale. Nothing about the desktop build needs it.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || isDesktopApp()) {
      return;
    }

    // Registered after load so it never competes with the first paint.
    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // An unregistered worker costs offline support and nothing else,
        // so a failure here must never surface to the user.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
