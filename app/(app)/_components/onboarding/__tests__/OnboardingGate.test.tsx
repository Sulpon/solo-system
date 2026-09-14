import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import OnboardingGate from "../OnboardingGate";
import { CloudSyncProvider } from "../../../_lib/cloud-sync-store";
import { ProgressionProvider } from "../../../_lib/progression-store";

// End-to-end proof of the actual user-visible requirement: a hung Supabase
// auth.getSession() must not leave Atlas stuck on "Loading Atlas..."
// forever - see this milestone's diagnosis report. Mounts the REAL
// OnboardingGate + CloudSyncProvider (+ ProgressionProvider, which
// OnboardingGate also reads from) together, not just CloudSyncProvider in
// isolation (cloud-sync-store.test.tsx already covers that layer alone), so
// this is a genuine test of the full gate a real user sees.
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

const getSessionDeferred = { current: createDeferred<{ data: { session: null } }>() };

vi.mock("../../../_lib/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => getSessionDeferred.current.promise,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  }),
}));

function renderGate() {
  return render(
    <ProgressionProvider>
      <CloudSyncProvider>
        <OnboardingGate>
          <div data-testid="real-app">Real Atlas UI</div>
        </OnboardingGate>
      </CloudSyncProvider>
    </ProgressionProvider>,
  );
}

beforeEach(() => {
  getSessionDeferred.current = createDeferred();
  window.localStorage.clear();
  // Skip the onboarding wizard itself so a cleared gate renders `children`
  // directly - this test is about the loading GATE, not the wizard flow.
  window.localStorage.setItem("menace-onboarding-completed", "true");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OnboardingGate with a hanging Supabase auth check", () => {
  it("shows the loading screen while auth.getSession() is still pending", async () => {
    renderGate();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText("Loading Atlas...")).toBeInTheDocument();
    expect(screen.queryByTestId("real-app")).not.toBeInTheDocument();
  });

  it("renders the real app once auth.getSession() resolves normally (no regression to the happy path)", async () => {
    renderGate();

    await act(async () => {
      getSessionDeferred.current.resolve({ data: { session: null } });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId("real-app")).toBeInTheDocument();
    expect(screen.queryByText("Loading Atlas...")).not.toBeInTheDocument();
  });

  it("still shows the loading screen well before the timeout elapses (not a hair-trigger fallback)", async () => {
    vi.useFakeTimers();

    renderGate();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByText("Loading Atlas...")).toBeInTheDocument();
    expect(screen.queryByTestId("real-app")).not.toBeInTheDocument();
  });

  it("falls back to local/offline mode and renders the real app once the timeout elapses on a hung auth check", async () => {
    vi.useFakeTimers();

    renderGate();

    // CLOUD_SYNC_TIMEOUT_MS is 8000ms - getSessionDeferred is deliberately
    // never resolved in this test.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });

    expect(screen.queryByText("Loading Atlas...")).not.toBeInTheDocument();
    expect(screen.getByTestId("real-app")).toBeInTheDocument();
  });

  it("local Atlas remains usable (still mounted, no remount/flash back to loading) well after the timeout fallback", async () => {
    vi.useFakeTimers();

    renderGate();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(8000);
    });
    expect(screen.getByTestId("real-app")).toBeInTheDocument();

    // Time continuing to pass afterward (e.g. the hung request finally
    // erroring out on its own, long after Atlas already proceeded) must not
    // knock the app back into a loading state.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(screen.getByTestId("real-app")).toBeInTheDocument();
    expect(screen.queryByText("Loading Atlas...")).not.toBeInTheDocument();
  });
});
