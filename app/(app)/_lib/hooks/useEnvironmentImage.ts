"use client";

import { useCallback, useSyncExternalStore } from "react";

export type EnvironmentLoadState = "loading" | "ready" | "missing";

// One probe per URL for the life of the tab. Two callers ask whether an
// environment exists - the layer that draws it and the shell that has to
// give itself a stacking context for it - and they must get the same
// answer without probing twice.
//
// An external store rather than state in an effect: the result lives
// outside React (it is a property of the network, shared by every
// caller), and useSyncExternalStore is how a component reads that
// without writing state during an effect.
const cache = new Map<string, EnvironmentLoadState>();
const listeners = new Map<string, Set<() => void>>();

function settle(src: string, state: EnvironmentLoadState) {
  cache.set(src, state);
  listeners.get(src)?.forEach((notify) => notify());
}

function probe(src: string) {
  const image = new Image();
  image.onload = () => settle(src, "ready");
  image.onerror = () => settle(src, "missing");
  image.src = src;
}

// Whether a built-in environment image is actually there.
//
// The environments folder ships EMPTY on purpose - the registry names
// artwork that may not exist yet. So nothing may assume a file is
// present: a page with no image must look exactly as it did before
// environments existed, which makes "missing" a first-class answer
// rather than a broken layer.
export function useEnvironmentImage(src: string | null): EnvironmentLoadState {
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!src) {
        return () => {};
      }

      const existing = listeners.get(src);

      if (existing) {
        existing.add(notify);
      } else {
        listeners.set(src, new Set([notify]));
      }

      if (!cache.has(src)) {
        probe(src);
      }

      return () => {
        listeners.get(src)?.delete(notify);
      };
    },
    [src],
  );

  const getSnapshot = useCallback((): EnvironmentLoadState => (src ? (cache.get(src) ?? "loading") : "missing"), [src]);

  // Nothing is probed during server rendering, so the honest answer there
  // is "not yet" - the backdrop simply appears once the client confirms.
  const getServerSnapshot = useCallback((): EnvironmentLoadState => "loading", []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
