"use client";

import { isDesktopApp } from "./is-desktop";
import { getApplicationById } from "../os/application-registry";

// Phase 19 - the OS Capability Layer's first (and so far only) capability:
// launching a registered application. Follows the exact isolation rule
// is-desktop.ts documents ("nothing else should reach for
// window.__TAURI_INTERNALS__/@tauri-apps/api directly") - this is the one
// place that invokes the native `launch_application` command (see
// src-tauri/src/os_launcher.rs). Every export here is safe to call from a
// normal browser tab (isDesktopApp() guards it, returning an honest
// DESKTOP_UNAVAILABLE result rather than pretending to work) so JARVIS's
// action layer (_lib/jarvis/os-actions.ts) never needs its own
// desktop-vs-browser branching.
//
// Future OS capabilities (focus_application, close_application, open_url,
// ...) plug in here the same way: one more native command, one more
// function in this file, never a second desktop-control boundary.

export type LaunchApplicationResult =
  | Readonly<{ success: true; actionType: "open_application"; applicationId: string; applicationName: string }>
  | Readonly<{
      success: false;
      actionType: "open_application";
      applicationId: string;
      errorCode: "APPLICATION_NOT_SUPPORTED" | "APPLICATION_NOT_FOUND" | "LAUNCH_FAILED" | "DESKTOP_UNAVAILABLE";
      message: string;
    }>;

// The raw shape src-tauri/src/os_launcher.rs's LaunchApplicationResult
// serializes to (serde's default camelCase-free field naming - Rust's
// snake_case fields cross the IPC boundary as-is).
type NativeLaunchResult = Readonly<{
  success: boolean;
  application_id: string;
  error_code: string | null;
  message: string | null;
}>;

export async function launchApplication(applicationId: string): Promise<LaunchApplicationResult> {
  const entry = getApplicationById(applicationId);
  if (!entry) {
    return { success: false, actionType: "open_application", applicationId, errorCode: "APPLICATION_NOT_SUPPORTED", message: `"${applicationId}" is not a registered application.` };
  }

  if (!isDesktopApp()) {
    return {
      success: false,
      actionType: "open_application",
      applicationId,
      errorCode: "DESKTOP_UNAVAILABLE",
      message: `${entry.name} can only be opened from Atlas Desktop - this browser session has no native desktop control.`,
    };
  }

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const result = await invoke<NativeLaunchResult>("launch_application", { applicationId });

    if (result.success) {
      return { success: true, actionType: "open_application", applicationId, applicationName: entry.name };
    }

    const errorCode = result.error_code === "APPLICATION_NOT_FOUND" || result.error_code === "LAUNCH_FAILED" || result.error_code === "APPLICATION_NOT_SUPPORTED" ? result.error_code : "LAUNCH_FAILED";
    return { success: false, actionType: "open_application", applicationId, errorCode, message: result.message ?? `${entry.name} could not be launched.` };
  } catch (error) {
    return { success: false, actionType: "open_application", applicationId, errorCode: "LAUNCH_FAILED", message: `${entry.name} could not be launched (${error instanceof Error ? error.message : "unknown error"}).` };
  }
}
