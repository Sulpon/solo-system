import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const expected = process.env.ATLAS_CONNECTOR_API_KEY;
  const authorization = request.headers.get("authorization");
  if (!expected || !authorization?.startsWith("Bearer ")) return false;
  const supplied = new TextEncoder().encode(authorization.slice(7));
  const target = new TextEncoder().encode(expected);
  let diff = supplied.length ^ target.length;
  for (let i = 0; i < Math.max(supplied.length, target.length); i++) diff |= (supplied[i] ?? 0) ^ (target[i] ?? 0);
  return diff === 0;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.ATLAS_CONNECTOR_USER_ID;
  if (!url || !key || !userId) {
    return NextResponse.json({ error: "Atlas connector server configuration is incomplete." }, { status: 503 });
  }

  try {
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await supabase.from("user_atlas_data").select("data").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    const snapshot = data?.data && typeof data.data === "object" ? data.data as Record<string, unknown> : {};
    const raw = snapshot["menace-attributes"];
    let attributes: unknown[] = [];
    if (typeof raw === "string") {
      try { const parsed: unknown = JSON.parse(raw); if (Array.isArray(parsed)) attributes = parsed; } catch { /* return an empty list for malformed legacy data */ }
    } else if (Array.isArray(raw)) {
      attributes = raw;
    }
    const categories = attributes.filter((item) => !!item && typeof item === "object").map((item) => {
      const value = item as Record<string, unknown>;
      return { id: typeof value.id === "string" ? value.id : "", name: typeof value.name === "string" ? value.name : "" };
    }).filter((item) => item.id && item.name);
    return NextResponse.json({ categories });
  } catch (error) {
    console.error("[atlas-connector] categories read failed", error);
    return NextResponse.json({ error: "Unable to read Atlas categories." }, { status: 500 });
  }
}
