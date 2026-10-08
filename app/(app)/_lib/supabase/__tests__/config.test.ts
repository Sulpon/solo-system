import { describe, expect, it } from "vitest";
import { resolveConnectionState, validateSupabaseConfig } from "../config";

const REAL_URL = "https://abcdefghijklmnop.supabase.co";
const REAL_KEY = "sb_publishable_abcdefghijklmnopqrstuvwxyz";

describe("validateSupabaseConfig", () => {
  it("accepts a real hosted project", () => {
    expect(validateSupabaseConfig(REAL_URL, REAL_KEY)).toMatchObject({ configured: true, url: REAL_URL });
  });

  it("accepts a legacy JWT anon key", () => {
    expect(validateSupabaseConfig(REAL_URL, "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaaaaaaaaaaaa").configured).toBe(true);
  });

  it("treats missing values as not configured", () => {
    expect(validateSupabaseConfig(undefined, undefined).configured).toBe(false);
    expect(validateSupabaseConfig("", "").configured).toBe(false);
    expect(validateSupabaseConfig(REAL_URL, undefined).configured).toBe(false);
    expect(validateSupabaseConfig(undefined, REAL_KEY).configured).toBe(false);
  });

  it("treats whitespace-only values as not configured", () => {
    expect(validateSupabaseConfig("   ", "   ").configured).toBe(false);
  });

  it("rejects the exact placeholders shipped in .env.local.example", () => {
    // This is the real-world case: the example file copied verbatim, which
    // the previous Boolean(url && key) check happily accepted.
    const result = validateSupabaseConfig("https://your-project-ref.supabase.co", "your-anon-key");

    expect(result.configured).toBe(false);
    expect(result).toMatchObject({ reason: expect.stringContaining("placeholder") });
  });

  it("rejects placeholder markers regardless of case", () => {
    expect(validateSupabaseConfig("https://YOUR-PROJECT-REF.supabase.co", REAL_KEY).configured).toBe(false);
    expect(validateSupabaseConfig(REAL_URL, "CHANGEME-abcdefghijklmnop").configured).toBe(false);
  });

  it("rejects example.com and other non-Supabase hosts", () => {
    expect(validateSupabaseConfig("https://example.com", REAL_KEY).configured).toBe(false);
    expect(validateSupabaseConfig("https://my-app.vercel.app", REAL_KEY).configured).toBe(false);
  });

  it("rejects a malformed URL", () => {
    expect(validateSupabaseConfig("not a url", REAL_KEY).configured).toBe(false);
    expect(validateSupabaseConfig("abcdefghijklmnop.supabase.co", REAL_KEY).configured).toBe(false);
  });

  it("rejects http for a hosted project but allows it for a local stack", () => {
    expect(validateSupabaseConfig("http://abcdefghijklmnop.supabase.co", REAL_KEY).configured).toBe(false);
    expect(validateSupabaseConfig("http://localhost:54321", REAL_KEY).configured).toBe(true);
    expect(validateSupabaseConfig("http://127.0.0.1:54321", REAL_KEY).configured).toBe(true);
  });

  it("rejects a suspiciously short project ref", () => {
    expect(validateSupabaseConfig("https://abc.supabase.co", REAL_KEY).configured).toBe(false);
  });

  it("rejects a key too short to be real", () => {
    expect(validateSupabaseConfig(REAL_URL, "short").configured).toBe(false);
  });

  it("explains why it refused, so the UI can tell the user what to fix", () => {
    const result = validateSupabaseConfig("https://your-project-ref.supabase.co", REAL_KEY);

    expect(result.configured).toBe(false);
    if (!result.configured) expect(result.reason.length).toBeGreaterThan(10);
  });
});

describe("resolveConnectionState", () => {
  const base = { configured: true, isAuthLoading: false, hasUser: false, syncStatus: "idle" as const, syncError: null };

  it("reports not-configured above everything else", () => {
    expect(resolveConnectionState({ ...base, configured: false, hasUser: true, syncStatus: "synced" })).toBe("not-configured");
  });

  it("reports unreachable when the network never answered", () => {
    expect(resolveConnectionState({ ...base, hasUser: true, syncStatus: "offline" })).toBe("unreachable");
  });

  it("distinguishes an auth/RLS rejection from a generic failure", () => {
    expect(resolveConnectionState({ ...base, hasUser: true, syncStatus: "error", syncError: "JWT expired" })).toBe("auth-error");
    expect(resolveConnectionState({ ...base, hasUser: true, syncStatus: "error", syncError: "new row violates row-level security policy" })).toBe("auth-error");
  });

  it("reports configured-but-signed-out when there is no user", () => {
    expect(resolveConnectionState({ ...base, hasUser: false })).toBe("configured");
  });

  it("reports connected once a user is signed in and sync is healthy", () => {
    expect(resolveConnectionState({ ...base, hasUser: true, syncStatus: "synced" })).toBe("connected");
  });
});
