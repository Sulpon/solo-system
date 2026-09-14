// A generic "don't let this promise block the caller forever" wrapper - see
// cloud-sync-store.tsx's use of this against Supabase's auth.getSession()
// and the cloud-hydration query, both real network calls with no timeout of
// their own that were found to be able to leave Atlas's whole UI stuck on
// "Loading Atlas..." indefinitely if the network stalled (diagnosed via the
// OnboardingGate/CloudSyncProvider investigation - see that milestone's
// report). Deliberately generic and dependency-free so it's reusable
// anywhere else a network call needs the same guarantee, and independently
// unit-testable without touching Supabase at all.
export class TimeoutError extends Error {
  constructor(operationLabel: string, timeoutMs: number) {
    super(`${operationLabel} did not complete within ${timeoutMs}ms`);
    this.name = "TimeoutError";
  }
}

// Races `promise` against a timer. Resolves/rejects with whichever settles
// first - critically, this does NOT cancel or otherwise affect `promise`
// itself (JS promises aren't cancellable): a caller that also wants to
// observe a late, past-the-timeout result should attach its own `.then` to
// the original `promise` separately (see cloud-sync-store.tsx's
// getSession() handling, which does exactly this so a real sign-in is never
// dropped just because it arrived slightly after the timeout unblocked the
// UI). Takes a `PromiseLike<T>` rather than a strict `Promise<T>` so a
// Supabase query builder (a thenable, not a real Promise instance) can be
// passed directly without an extra `Promise.resolve(...)` wrapper.
export function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, operationLabel = "operation"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new TimeoutError(operationLabel, timeoutMs));
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}
