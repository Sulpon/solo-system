"use client";

import Card from "../Card";
import { defaultAppearanceSettings } from "../../_lib/mock/customization";
import { STORAGE_KEYS } from "../../_lib/storage-keys";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import type { AccentColor, AppearanceSettings, CornerRadius, Density, MenaceTheme } from "../../_lib/types/customization";

const optionClass = "rounded-xl border px-4 py-3 text-sm transition";

function getButtonClass(active: boolean) {
  return optionClass + " " + (active ? "border-purple-400/60 bg-purple-500/15 text-white shadow-[0_0_18px_rgba(168,85,247,0.14)]" : "border-slate-700 bg-slate-950/45 text-slate-300 hover:border-purple-400/50 hover:text-white");
}

export default function AppearanceSettingsPanel() {
  const [appearance, setAppearance, , resetAppearance] = useLocalStorageState<AppearanceSettings>(STORAGE_KEYS.appearance, defaultAppearanceSettings);

  function updateAppearance(next: Partial<AppearanceSettings>) {
    setAppearance((current) => ({ ...current, ...next }));
  }

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Appearance</p>
          <h2 className="mt-2 text-2xl font-black text-white">Personalize the system feel</h2>
          <p className="mt-2 text-sm text-slate-400">Appearance preferences are saved locally and applied through the app shell.</p>
        </div>
        <button type="button" onClick={resetAppearance} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">Reset Appearance</button>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Accent Color</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["purple", "blue", "green", "orange"] as AccentColor[]).map((color) => (
              <button key={color} type="button" onClick={() => updateAppearance({ accentColor: color })} className={getButtonClass(appearance.accentColor === color)}>{color}</button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Corner Radius</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(["compact", "comfortable", "rounded"] as CornerRadius[]).map((radius) => (
              <button key={radius} type="button" onClick={() => updateAppearance({ cornerRadius: radius })} className={getButtonClass(appearance.cornerRadius === radius)}>{radius}</button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Density</h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {(["compact", "normal", "spacious"] as Density[]).map((density) => (
              <button key={density} type="button" onClick={() => updateAppearance({ density })} className={getButtonClass(appearance.density === density)}>{density}</button>
            ))}
          </div>
        </section>

        <section>
          <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Theme</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(["dark", "oled"] as MenaceTheme[]).map((theme) => (
              <button key={theme} type="button" onClick={() => updateAppearance({ theme })} className={getButtonClass(appearance.theme === theme)}>{theme}</button>
            ))}
          </div>
        </section>
      </div>
    </Card>
  );
}
