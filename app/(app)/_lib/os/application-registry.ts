// Phase 19 - Atlas OS v1's controlled application registry. This is the
// user-facing, platform-agnostic half of the same registry
// src-tauri/src/os_launcher.rs owns natively - the two are kept in sync by
// hand (a handful of ids, not worth generating), and BOTH must agree an id
// is real before anything launches: this file lets JARVIS resolve natural
// language ("open chrome") to a stable `applicationId` and show a real
// display name, but the NATIVE side is what actually verifies the
// application can be launched and owns the real launch operation (see
// _lib/desktop/os-launcher.ts). Nothing here ever produces a path, a shell
// command, or an argument list - only a short, registered id.
//
// Adding another approved application is exactly this: one more entry here
// (id/name/aliases) plus one more native launch-path match arm in
// os_launcher.rs - no other file needs to change.

export type OsApplicationId = "chrome" | "edge" | "vscode" | "spotify" | "notepad";

export type OsApplicationEntry = Readonly<{
  id: OsApplicationId;
  name: string;
  aliases: ReadonlyArray<string>;
}>;

export const OS_APPLICATION_REGISTRY: ReadonlyArray<OsApplicationEntry> = [
  { id: "chrome", name: "Google Chrome", aliases: ["chrome", "google chrome"] },
  { id: "edge", name: "Microsoft Edge", aliases: ["edge", "microsoft edge", "msedge"] },
  { id: "vscode", name: "Visual Studio Code", aliases: ["vscode", "vs code", "visual studio code", "code"] },
  { id: "spotify", name: "Spotify", aliases: ["spotify"] },
  { id: "notepad", name: "Notepad", aliases: ["notepad"] },
];

export function getApplicationById(id: string): OsApplicationEntry | null {
  return OS_APPLICATION_REGISTRY.find((entry) => entry.id === id) ?? null;
}

// Deterministic resolution only - an exact id match, then an exact alias
// match, then an exact display-name match, all case-insensitive. Never a
// fuzzy/partial match (unlike Atlas's own Quest/Goal idOrTitle lookups) -
// an OS action is real-world-visible and shouldn't guess between, say,
// "vscode" and some future "vscode-insiders" entry.
export function resolveApplication(query: string | undefined): OsApplicationEntry | null {
  const normalized = query?.trim().toLowerCase();
  if (!normalized) return null;

  return (
    OS_APPLICATION_REGISTRY.find((entry) => entry.id === normalized) ??
    OS_APPLICATION_REGISTRY.find((entry) => entry.aliases.some((alias) => alias.toLowerCase() === normalized)) ??
    OS_APPLICATION_REGISTRY.find((entry) => entry.name.toLowerCase() === normalized) ??
    null
  );
}
