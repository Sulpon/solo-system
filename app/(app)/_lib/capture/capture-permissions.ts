// Opt-in permission for every capture source. Default DENY.
//
// Separate from ai-core/permissions.ts on purpose, not by oversight: that
// module gates which JARVIS TOOLS the model may invoke, and its answers are
// fixed in code (TOOL_PERMISSIONS is a constant - the user cannot grant or
// revoke anything). This gates which real-world SOURCES Atlas may observe,
// and is user-owned, persisted state. Folding a user-grantable consent
// record into a hardcoded capability table would make both harder to
// reason about.
//
// The default-deny shape is what makes "no silent recording" structural:
// a provider with no stored grant is off, so forgetting to wire consent
// fails closed (nothing is captured) rather than open.

export type CaptureProviderPermission = Readonly<{
  // Matches CaptureProvider.id (see provider.ts).
  id: string;
  grantedAt: string | null;
  revokedAt: string | null;
  updatedAt: string;
}>;

export type CapturePermissionDecision = Readonly<{ allowed: boolean; reason: string }>;

export function findCapturePermission(permissions: ReadonlyArray<CaptureProviderPermission>, providerId: string): CaptureProviderPermission | null {
  return permissions.find((permission) => permission.id === providerId) ?? null;
}

// The single check every capture path must make before a provider reads
// anything. An unknown provider is denied, not defaulted - same safe
// failure mode as authorize()'s "unrecognized capability" branch.
export function authorizeCaptureProvider(permissions: ReadonlyArray<CaptureProviderPermission>, providerId: string): CapturePermissionDecision {
  const permission = findCapturePermission(permissions, providerId);

  if (!permission) {
    return { allowed: false, reason: `"${providerId}" has never been enabled - Atlas captures nothing from a source you have not turned on.` };
  }

  if (permission.revokedAt || !permission.grantedAt) {
    return { allowed: false, reason: `"${providerId}" is turned off.` };
  }

  return { allowed: true, reason: "Enabled by you." };
}

export function isCaptureProviderEnabled(permissions: ReadonlyArray<CaptureProviderPermission>, providerId: string): boolean {
  return authorizeCaptureProvider(permissions, providerId).allowed;
}

export function grantCapturePermission(permissions: ReadonlyArray<CaptureProviderPermission>, providerId: string, at = new Date().toISOString()): ReadonlyArray<CaptureProviderPermission> {
  const next: CaptureProviderPermission = { id: providerId, grantedAt: at, revokedAt: null, updatedAt: at };

  return findCapturePermission(permissions, providerId) ? permissions.map((permission) => (permission.id === providerId ? next : permission)) : [...permissions, next];
}

// Revoking keeps the row rather than deleting it, so the UI can honestly
// show "you turned this off on <date>" instead of the source silently
// reverting to looking like it was never offered.
export function revokeCapturePermission(permissions: ReadonlyArray<CaptureProviderPermission>, providerId: string, at = new Date().toISOString()): ReadonlyArray<CaptureProviderPermission> {
  const existing = findCapturePermission(permissions, providerId);
  if (!existing) {
    return [...permissions, { id: providerId, grantedAt: null, revokedAt: at, updatedAt: at }];
  }

  return permissions.map((permission) => (permission.id === providerId ? { ...permission, revokedAt: at, updatedAt: at } : permission));
}
