// Whether Supabase is ACTUALLY configured, as opposed to merely having two
// non-empty environment variables.
//
// The previous check was `Boolean(url && key)`. With .env.local.example's
// placeholders copied verbatim - the normal way anyone sets this up -
// that returns true, so Atlas believed cloud sync was available, rendered
// "Sign in with Google", constructed a real client and fired every request
// at https://your-project-ref.supabase.co, which does not resolve. The
// user sees auth controls that cannot work and sync errors with no
// explanation.
//
// Deliberately conservative: when this says "configured" it must mean the
// values are at least structurally capable of reaching a real project.
// Whether that project exists is a network question, answered separately
// (see SupabaseConnectionState).

export type SupabaseConfigResult =
  | Readonly<{ configured: true; url: string; anonKey: string }>
  | Readonly<{ configured: false; reason: string }>;

// Substrings that mark a value as copied-from-the-example rather than real.
// Matched case-insensitively against the whole value.
const PLACEHOLDER_MARKERS: ReadonlyArray<string> = [
  "your-project-ref",
  "your-project",
  "your_project",
  "your-anon-key",
  "your_anon_key",
  "yourproject",
  "example.com",
  "changeme",
  "change-me",
  "placeholder",
  "<your",
  "xxxxx",
  "todo",
];

function looksLikePlaceholder(value: string): boolean {
  const lowered = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker));
}

// A hosted project is <ref>.supabase.co. A self-hosted or CLI-local stack
// is allowed too, but ONLY on an explicit loopback host - "localhost"
// appearing anywhere else is far more likely to be a copy-paste accident
// than an intentional local Supabase.
function isAcceptableHost(parsed: URL): boolean {
  const host = parsed.hostname.toLowerCase();

  if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
    return true;
  }

  // <ref>.supabase.co / .supabase.in, with a non-empty ref that is not the
  // literal example ref.
  const hostedMatch = /^([a-z0-9-]+)\.supabase\.(co|in)$/.exec(host);
  return Boolean(hostedMatch && hostedMatch[1].length >= 8);
}

export function validateSupabaseConfig(rawUrl: string | undefined, rawKey: string | undefined): SupabaseConfigResult {
  const url = rawUrl?.trim() ?? "";
  const anonKey = rawKey?.trim() ?? "";

  if (!url && !anonKey) return { configured: false, reason: "No Supabase URL or key is set." };
  if (!url) return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_URL is not set." };
  if (!anonKey) return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_ANON_KEY is not set." };

  if (looksLikePlaceholder(url)) return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_URL still holds an example placeholder value." };
  if (looksLikePlaceholder(anonKey)) return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_ANON_KEY still holds an example placeholder value." };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_URL is not a valid URL." };
  }

  const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "[::1]";

  if (parsed.protocol !== "https:" && !(parsed.protocol === "http:" && isLoopback)) {
    return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_URL must use https (http is only accepted for a local Supabase stack)." };
  }

  if (!isAcceptableHost(parsed)) {
    return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_URL does not look like a Supabase project URL." };
  }

  // Both the current publishable format and the legacy JWT are accepted;
  // anything shorter than either is not a real key. No attempt is made to
  // validate the key's contents - that is the server's job, and guessing
  // would only produce false negatives.
  if (anonKey.length < 20) {
    return { configured: false, reason: "NEXT_PUBLIC_SUPABASE_ANON_KEY is too short to be a real key." };
  }

  return { configured: true, url, anonKey };
}

// What the UI should say about the cloud connection. Distinct from
// "configured": a correctly configured project can still be unreachable,
// and a reachable one can still reject the user.
export type SupabaseConnectionState = "not-configured" | "configured" | "unreachable" | "auth-error" | "connected";

export const CONNECTION_STATE_LABELS: Readonly<Record<SupabaseConnectionState, string>> = {
  "not-configured": "Not configured",
  configured: "Configured — not signed in",
  unreachable: "Unreachable",
  "auth-error": "Authentication error",
  connected: "Connected",
};

export function resolveConnectionState(
  input: Readonly<{ configured: boolean; isAuthLoading: boolean; hasUser: boolean; syncStatus: "idle" | "syncing" | "synced" | "offline" | "error"; syncError: string | null }>,
): SupabaseConnectionState {
  if (!input.configured) return "not-configured";
  if (input.syncStatus === "offline") return "unreachable";

  // An error naming auth/JWT/RLS is the user's session being rejected, not
  // the network failing - those need different fixes, so they must not
  // both show as a generic error.
  if (input.syncStatus === "error" && input.syncError && /auth|jwt|token|permission|rls|row-level/i.test(input.syncError)) {
    return "auth-error";
  }

  if (!input.hasUser) return "configured";
  return input.syncStatus === "error" ? "auth-error" : "connected";
}
