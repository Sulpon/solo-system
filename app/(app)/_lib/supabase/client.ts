import { createBrowserClient } from "@supabase/ssr";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export function isSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    // TEMPORARY diagnostic instrumentation - see cloud-sync-store.tsx's
    // authDiag and this milestone's report. Only fires once (client is
    // memoized in the module-level `browserClient`), so this marks exactly
    // when the real Supabase client first comes into existence.
    console.log("[Atlas][Supabase] constructing browser client");
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }

  return browserClient;
}
