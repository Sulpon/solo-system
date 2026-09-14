import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { CloudSyncProvider } from "../cloud-sync-store";
import { useCloudSync } from "../hooks/useCloudSync";

// Controls exactly when/how the mocked auth.getSession() settles - a real
// Supabase client's getSession() promise for the "hangs indefinitely" case
// (never resolves), vs. a normal test's immediately-resolving mock.
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const getSessionDeferred = { current: createDeferred<{ data: { session: null } }>() };
const onAuthStateChangeUnsubscribe = vi.fn();

vi.mock("../supabase/client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => getSessionDeferred.current.promise,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: onAuthStateChangeUnsubscribe } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

function Probe() {
  const { isAuthLoading, user } = useCloudSync();
  return (
    <div>
      <div data-testid="is-auth-loading">{String(isAuthLoading)}</div>
      <div data-testid="user-id">{user?.id ?? "none"}</div>
    </div>
  );
}

beforeEach(() => {
  getSessionDeferred.current = createDeferred();
  onAuthStateChangeUnsubscribe.mockClear();
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CloudSyncProvider auth loading", () => {
  it("resolves isAuthLoading quickly when auth.getSession() resolves normally", async () => {
    render(
      <CloudSyncProvider>
        <Probe />
      </CloudSyncProvider>,
    );

    expect(screen.getByTestId("is-auth-loading").textContent).toBe("true");

    await act(async () => {
      getSessionDeferred.current.resolve({ data: { session: null } });
    });

    expect(screen.getByTestId("is-auth-loading").textContent).toBe("false");
  });

  it("applies a real signed-in user once getSession() resolves", async () => {
    render(
      <CloudSyncProvider>
        <Probe />
      </CloudSyncProvider>,
    );

    await act(async () => {
      // @ts-expect-error - only the fields CloudSyncProvider reads are needed for this test.
      getSessionDeferred.current.resolve({ data: { session: { user: { id: "user-123" } } } });
    });

    expect(screen.getByTestId("is-auth-loading").textContent).toBe("false");
    expect(screen.getByTestId("user-id").textContent).toBe("user-123");
  });

  it("resolves isAuthLoading (does not stay stuck) when auth.getSession() rejects", async () => {
    render(
      <CloudSyncProvider>
        <Probe />
      </CloudSyncProvider>,
    );

    expect(screen.getByTestId("is-auth-loading").textContent).toBe("true");

    await act(async () => {
      getSessionDeferred.current.reject(new Error("network error"));
      // Let the rejection's microtasks (the .catch handlers) flush.
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("is-auth-loading").textContent).toBe("false");
  });

  it("does NOT resolve isAuthLoading immediately when auth.getSession() hangs indefinitely", async () => {
    vi.useFakeTimers();

    render(
      <CloudSyncProvider>
        <Probe />
      </CloudSyncProvider>,
    );

    // getSessionDeferred is never resolved/rejected in this test - simulates
    // a genuinely hung network call.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByTestId("is-auth-loading").textContent).toBe("true");
  });

  it("falls back to local/offline mode (isAuthLoading becomes false) once the timeout elapses on a hung getSession()", async () => {
    vi.useFakeTimers();

    render(
      <CloudSyncProvider>
        <Probe />
      </CloudSyncProvider>,
    );

    await act(async () => {
      // CLOUD_SYNC_TIMEOUT_MS in cloud-sync-store.tsx is 8000ms.
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.getByTestId("is-auth-loading").textContent).toBe("false");
    expect(screen.getByTestId("user-id").textContent).toBe("none");
  });

  it("still applies a late-arriving real session after the timeout already unblocked the UI", async () => {
    vi.useFakeTimers();

    render(
      <CloudSyncProvider>
        <Probe />
      </CloudSyncProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(screen.getByTestId("is-auth-loading").textContent).toBe("false");
    expect(screen.getByTestId("user-id").textContent).toBe("none");

    // The real network call finally comes back, well after the timeout.
    await act(async () => {
      // @ts-expect-error - only the fields CloudSyncProvider reads are needed for this test.
      getSessionDeferred.current.resolve({ data: { session: { user: { id: "late-user" } } } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("user-id").textContent).toBe("late-user");
  });
});
