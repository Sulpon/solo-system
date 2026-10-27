import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { validateSupabaseConfig } from "../../supabase/config";
import { getSupabaseServerClient } from "../../supabase/server";

// Every finance route starts here: Supabase must be configured and the
// request must carry a valid session. The user id comes from Supabase's
// verification of the session (auth.getUser), never from the request.

export type AuthorizedRequest = Readonly<{ client: SupabaseClient; userId: string }>;

export function jsonError(status: number, code: string, message: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ error: { code, message }, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function authorizeFinanceRequest(): Promise<AuthorizedRequest | NextResponse> {
  const config = validateSupabaseConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!config.configured) {
    return jsonError(503, "not_configured", "Finance needs Supabase, which is not configured for this Atlas.");
  }

  const client = (await getSupabaseServerClient()) as unknown as SupabaseClient;
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return jsonError(401, "unauthenticated", "Sign in to use Finance.");
  }

  return { client, userId: data.user.id };
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
