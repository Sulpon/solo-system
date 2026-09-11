"use client";

import { isDesktopApp } from "./is-desktop";

// Thin wrapper around @tauri-apps/plugin-autostart, isolated here per the
// same "don't scatter Tauri specifics through components" rule as the rest
// of _lib/desktop/ - see GeneralSettingsPanel.tsx, the only current caller.
// There is no separate app-side persisted setting: whether autostart is
// enabled IS the OS registry/login-item entry the plugin manages, so
// isAutostartEnabled() always reflects the real, current OS state rather
// than a second, possibly-stale copy of it.
export async function isAutostartEnabled(): Promise<boolean> {
  if (!isDesktopApp()) {
    return false;
  }

  const { isEnabled } = await import("@tauri-apps/plugin-autostart");
  return isEnabled();
}

export async function setAutostartEnabled(enabled: boolean): Promise<void> {
  if (!isDesktopApp()) {
    return;
  }

  const { enable, disable } = await import("@tauri-apps/plugin-autostart");
  await (enabled ? enable() : disable());
}
