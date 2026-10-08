import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import OnboardingGate from "../OnboardingGate";
import { CloudSyncProvider } from "../../../_lib/cloud-sync-store";

// A permanently-blocked startup must stop pretending it's still loading.
// This is the safety net for causes nobody has identified yet (the reported
// "Atlas stuck on Loading Atlas... forever" failure mode): whatever the
// cause, the user gets a diagnostic naming the stuck gate and a way out,
// instead of an indefinite loading shell.
//
// Blocks startup via useProgression (never ready) rather than auth, because
// both network-bound gates are now themselves timeout-bounded and would
// otherwise resolve on their own - see cloud-sync-store.tsx.
vi.mock("../../../_lib/hooks/useProgression", () => ({
  useProgression: () => ({
    isReady: false,
    questDefinitions: [],
    questCompletions: [],
    progressionSummary: { currentLevel: 1, dailyXP: 0, totalXP: 0 },
    setQuestDefinitions: vi.fn(),
  }),
}));

vi.mock("../../../_lib/supabase/client", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseConfig: () => ({ configured: true, url: "https://abcdefghijklmnop.supabase.co", anonKey: "sb_publishable_abcdefghijklmnopqrstuvwxyz" }),
  getSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
      signInWithOAuth: vi.fn(),
      signOut: vi.fn(),
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }) }),
  }),
}));

function renderGate() {
  return render(
    <CloudSyncProvider>
      <OnboardingGate>
        <div data-testid="real-app">Real Atlas UI</div>
      </OnboardingGate>
    </CloudSyncProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem("menace-onboarding-completed", "true");
});

afterEach(() => {
  vi.useRealTimers();
});

describe("OnboardingGate stall diagnostic", () => {
  it("keeps showing the normal loading shell before the stall threshold", async () => {
    vi.useFakeTimers();
    renderGate();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(9000);
    });

    expect(screen.getByText("Loading Atlas...")).toBeInTheDocument();
    expect(screen.queryByText(/taking longer than expected/i)).not.toBeInTheDocument();
  });

  it("replaces the indefinite loading shell with a diagnostic once startup has clearly stalled", async () => {
    vi.useFakeTimers();
    renderGate();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });

    expect(screen.queryByText("Loading Atlas...")).not.toBeInTheDocument();
    expect(screen.getByText(/taking longer than expected/i)).toBeInTheDocument();
    // Names the actual stuck gate rather than a generic message.
    expect(screen.getByText(/Quests and progression/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reload Atlas/i })).toBeInTheDocument();
  });

  it("never forces the app through - a stalled start shows the diagnostic, not a half-initialized UI", async () => {
    vi.useFakeTimers();
    renderGate();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(30_000);
    });

    expect(screen.queryByTestId("real-app")).not.toBeInTheDocument();
  });

  it("states that Atlas needs no account or AI provider to run", async () => {
    vi.useFakeTimers();
    renderGate();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(12_000);
    });

    expect(screen.getByText(/does not need an internet connection, an account, or an AI provider/i)).toBeInTheDocument();
  });
});
