import { createBrowserClient } from "@supabase/ssr";
import { validateSupabaseConfig, type SupabaseConfigResult } from "./config";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

// Reads the env vars exactly once per call so tests can vary them, and
// delegates every judgement to the validator (see ./config.ts). Previously
// this was Boolean(url && key), which the example file's own placeholders
// satisfy.
export function getSupabaseConfig(): SupabaseConfigResult {
  return validateSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isSupabaseConfigured() {
  return getSupabaseConfig().configured;
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    // TEMPORARY diagnostic instrumentation - see cloud-sync-store.tsx's
    // authDiag and this milestone's report. Only fires once (client is
    // memoized in the module-level `browserClient`), so this marks exactly
    // when the real Supabase client first comes into existence.
    console.log("[Atlas][Supabase] constructing browser client");
    const config = getSupabaseConfig();

    // Guarded rather than non-null-asserted: constructing a client from
    // placeholder values is what produced the "configured but every
    // request fails" state this validation exists to prevent.
    if (!config.configured) {
      throw new Error(`Supabase is not configured: ${config.reason}`);
    }

    browserClient = createBrowserClient(config.url, config.anonKey);
  }

  return browserClient;
}
