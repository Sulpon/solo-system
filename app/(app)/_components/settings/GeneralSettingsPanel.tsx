"use client";

import { useEffect, useState } from "react";
import Card from "../Card";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import { STORAGE_KEYS } from "../../_lib/storage-keys";
import { isDesktopApp } from "../../_lib/desktop/is-desktop";
import { isAutostartEnabled, setAutostartEnabled } from "../../_lib/desktop/autostart";

export default function GeneralSettingsPanel() {
  const [, setOnboardingCompleted] = useLocalStorageState<boolean>(STORAGE_KEYS.onboardingCompleted, false);

  function restartOnboarding() {
    if (!window.confirm("Restart onboarding? Your existing attributes, dreams, goals, and quests will not be deleted.")) {
      return;
    }

    setOnboardingCompleted(false);
  }

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">General</p>
        <h2 className="mt-2 text-2xl font-black text-white">About Atlas</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
          Your attributes, quests, dashboard, and daily progress are saved on this device.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {["Private by default", "Works offline", "Optional cloud sync"].map((item) => (
            <div key={item} className="rounded-xl border border-slate-800 bg-slate-950/45 p-4 text-sm font-semibold text-slate-200">{item}</div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Onboarding</p>
            <h2 className="mt-2 text-xl font-black text-white">Restart Onboarding</h2>
            <p className="mt-2 max-w-xl text-sm text-slate-400">
              Replays the Atlas character-creation flow the next time you load the app. This only resets the onboarding flag - none of your existing data is deleted.
            </p>
          </div>
          <button
            type="button"
            onClick={restartOnboarding}
            className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
          >
            Restart Onboarding
          </button>
        </div>
      </Card>

      {isDesktopApp() ? <StartupSettingsCard /> : null}
    </div>
  );
}

// Whether autostart is on IS the OS registry/login-item entry the
// tauri-plugin-autostart Rust plugin manages - there's no separate
// "isAutostartEnabled" flag saved anywhere in Atlas's own storage to drift
// out of sync with it, so this always reads the real, current state.
function StartupSettingsCard() {
  const [enabled, setEnabled] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void isAutostartEnabled().then((value) => {
      if (!cancelled) {
        setEnabled(value);
        setIsLoaded(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleStartup() {
    setIsPending(true);
    const next = !enabled;

    try {
      await setAutostartEnabled(next);
      setEnabled(next);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Desktop</p>
          <h2 className="mt-2 text-xl font-black text-white">Launch Atlas when Windows starts</h2>
          <p className="mt-2 max-w-xl text-sm text-slate-400">Off by default. Atlas starts normally, no extra window or prompt.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          disabled={!isLoaded || isPending}
          onClick={() => void toggleStartup()}
          className={
            "relative h-7 w-12 shrink-0 rounded-full border transition disabled:opacity-50 " +
            (enabled ? "border-purple-400/60 bg-purple-500/40" : "border-slate-700 bg-slate-800")
          }
        >
          <span className={"absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all " + (enabled ? "left-6" : "left-0.5")} />
        </button>
      </div>
    </Card>
  );
}
