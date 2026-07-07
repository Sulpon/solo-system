"use client";

import Card from "../Card";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import { STORAGE_KEYS } from "../../_lib/storage-keys";

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
    </div>
  );
}
