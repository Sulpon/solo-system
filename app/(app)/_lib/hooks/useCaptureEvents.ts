"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorageState } from "./use-local-storage-state";
import { STORAGE_KEYS } from "../storage-keys";
import { addCaptureEvents, createCaptureEvent, getPendingCaptures, markCaptureApplied, resolveCaptureEvent, supersedeCaptureEvent } from "../capture/capture-engine";
import { authorizeCaptureProvider, grantCapturePermission, revokeCapturePermission } from "../capture/capture-permissions";
import { findCaptureProvider, validateCaptureDrafts } from "../capture/provider";
import { CAPTURE_PROVIDERS } from "../capture/provider-registry";
import type { CaptureProviderPermission } from "../capture/capture-permissions";
import type { CaptureInterpretationRequest } from "../capture/provider";
import type { CaptureEvent } from "../types/capture";

// Persistence + orchestration for Automatic Life Capture. All rules live in
// the pure engine; this hook only stores the results and enforces the order
// the pipeline must run in.

export type RecordCaptureOutcome = Readonly<{
  created: ReadonlyArray<CaptureEvent>;
  // Populated whenever nothing was created, so a caller can tell the user
  // the truth ("that source is turned off", "nothing was entered") rather
  // than failing silently or inventing a capture.
  note: string | null;
}>;

export function useCaptureEvents() {
  const [captureEvents, setCaptureEvents, hasLoaded] = useLocalStorageState<CaptureEvent[]>(STORAGE_KEYS.captureEvents, []);
  const [permissions, setPermissions, hasPermissionsLoaded] = useLocalStorageState<CaptureProviderPermission[]>(STORAGE_KEYS.capturePermissions, []);

  // The full pipeline, in the only order that is safe:
  // permission -> provider -> validate drafts -> mint events -> dedupe.
  // A provider is never invoked before its permission check, so a
  // disabled source does not even read its input.
  const recordCapture = useCallback(
    async (providerId: string, request: CaptureInterpretationRequest): Promise<RecordCaptureOutcome> => {
      const provider = findCaptureProvider(CAPTURE_PROVIDERS, providerId);
      if (!provider) {
        return { created: [], note: `"${providerId}" is not a registered capture source.` };
      }

      const decision = authorizeCaptureProvider(permissions, providerId);
      if (!decision.allowed) {
        return { created: [], note: decision.reason };
      }

      const interpretation = await provider.interpret(request);
      const drafts = validateCaptureDrafts(interpretation, provider);
      const created = drafts.map(createCaptureEvent).filter((event): event is CaptureEvent => event !== null);

      if (created.length === 0) {
        return { created: [], note: interpretation.note ?? "Nothing was captured — there was not enough evidence to record anything." };
      }

      setCaptureEvents((current) => addCaptureEvents(current, created));
      return { created, note: null };
    },
    [permissions, setCaptureEvents],
  );

  // Writes only when the engine actually changed something: the engine
  // returns the same array reference for a no-op (already resolved, unknown
  // id), and short-circuiting here keeps a double-click from producing a
  // redundant storage write and sync push.
  const applyEngineResult = useCallback(
    (produce: (current: CaptureEvent[]) => ReadonlyArray<CaptureEvent>) => {
      setCaptureEvents((current) => {
        const next = produce(current);
        return next === current ? current : [...next];
      });
    },
    [setCaptureEvents],
  );

  const confirmCapture = useCallback(
    (id: string, note?: string) => applyEngineResult((current) => resolveCaptureEvent(current, id, { action: "confirmed", by: "user", note })),
    [applyEngineResult],
  );

  const rejectCapture = useCallback(
    (id: string, note?: string) => applyEngineResult((current) => resolveCaptureEvent(current, id, { action: "rejected", by: "user", note })),
    [applyEngineResult],
  );

  const supersedeCapture = useCallback((id: string, supersededBy: string) => applyEngineResult((current) => supersedeCaptureEvent(current, id, supersededBy)), [applyEngineResult]);

  // Called by a domain adapter AFTER it has written its real records, so a
  // capture can never be applied - or paid XP for - twice.
  const markApplied = useCallback((id: string, recordIds: ReadonlyArray<string>) => applyEngineResult((current) => markCaptureApplied(current, id, recordIds)), [applyEngineResult]);

  const enableProvider = useCallback((providerId: string) => setPermissions((current) => [...grantCapturePermission(current, providerId)]), [setPermissions]);

  const disableProvider = useCallback((providerId: string) => setPermissions((current) => [...revokeCapturePermission(current, providerId)]), [setPermissions]);

  const isProviderEnabled = useCallback((providerId: string) => authorizeCaptureProvider(permissions, providerId).allowed, [permissions]);

  const pendingCaptures = useMemo(() => getPendingCaptures(captureEvents), [captureEvents]);

  return {
    captureEvents,
    pendingCaptures,
    permissions,
    providers: CAPTURE_PROVIDERS,
    recordCapture,
    confirmCapture,
    rejectCapture,
    supersedeCapture,
    markApplied,
    enableProvider,
    disableProvider,
    isProviderEnabled,
    hasLoaded: hasLoaded && hasPermissionsLoaded,
  } as const;
}
