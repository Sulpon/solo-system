import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Quest = {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  xp: number;
  cadence: "daily" | "weekly" | "one-time";
  importance?: "core" | "bonus";
  kind?: "task" | "habit";
  status: "active" | "archived";
  scheduledDate?: string;
  createdAt: string;
  updatedAt: string;
};

const QUESTS_KEY = "menace-quest-list";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Atlas connector server configuration is incomplete.");
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function isAuthorized(request: NextRequest) {
  const expected = process.env.ATLAS_CONNECTOR_API_KEY;
  if (!expected) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return false;
  const supplied = authorization.slice("Bearer ".length);
  // Compare fixed-length hashes to avoid leaking secret length or early mismatch position.
  const encoder = new TextEncoder();
  const a = encoder.encode(supplied);
  const b = encoder.encode(expected);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

function parseCollection(value: unknown): Quest[] {
  if (typeof value !== "string") return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is Quest =>
      !!item &&
      typeof item === "object" &&
      typeof (item as Quest).id === "string" &&
      typeof (item as Quest).title === "string"
    );
  } catch {
    return [];
  }
}

async function loadSnapshot() {
  const userId = process.env.ATLAS_CONNECTOR_USER_ID;
  if (!userId) throw new Error("Atlas connector server configuration is incomplete.");
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_atlas_data")
    .select("data, version")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { snapshot: {} as Record<string, unknown>, version: null as number | null };
  const snapshot = data.data && typeof data.data === "object" && !Array.isArray(data.data)
    ? data.data as Record<string, unknown>
    : {};
  return { snapshot, version: data.version as number };
}

async function saveQuestCollection(snapshot: Record<string, unknown>, version: number | null, quests: Quest[]) {
  const userId = process.env.ATLAS_CONNECTOR_USER_ID!;
  const supabase = getSupabaseAdmin();
  const nextSnapshot = { ...snapshot, [QUESTS_KEY]: JSON.stringify(quests) };

  if (version === null) {
    const { error } = await supabase.from("user_atlas_data").insert({
      user_id: userId,
      data: nextSnapshot,
      version: 1,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return;
  }

  // Optimistic concurrency: never overwrite a snapshot changed by another client.
  const { data, error } = await supabase
    .from("user_atlas_data")
    .update({ data: nextSnapshot, version: version + 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("version", version)
    .select("user_id");

  if (error) throw error;
  if (!data?.length) {
    throw Object.assign(new Error("Atlas data changed during this request. Retry the action."), { code: "CONFLICT" });
  }
}

function toPublicQuest(quest: Quest) {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description ?? "",
    categoryId: quest.categoryId,
    xp: quest.xp,
    cadence: quest.cadence,
    importance: quest.importance ?? "core",
    kind: quest.kind ?? "task",
    status: quest.status,
    scheduledDate: quest.scheduledDate ?? null,
    createdAt: quest.createdAt,
    updatedAt: quest.updatedAt,
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  try {
    const { snapshot } = await loadSnapshot();
    const raw = snapshot[QUESTS_KEY];
    const quests = parseCollection(typeof raw === "string" ? raw : JSON.stringify(raw ?? []));
    return NextResponse.json({ quests: quests.map(toPublicQuest), count: quests.length });
  } catch (error) {
    console.error("[atlas-connector] read failed", error);
    return NextResponse.json({ error: "Unable to read Atlas quests." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "A quest object is required." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const categoryId = typeof input.categoryId === "string" ? input.categoryId.trim() : "";
  const cadence = input.cadence;
  const kind = input.kind ?? "task";
  const xp = input.xp ?? 0;
  const scheduledDate = input.scheduledDate;

  if (!title || title.length > 180) return NextResponse.json({ error: "title is required (max 180 characters)." }, { status: 400 });
  if (!categoryId || categoryId.length > 100) return NextResponse.json({ error: "categoryId is required." }, { status: 400 });
  if (cadence !== "daily" && cadence !== "weekly" && cadence !== "one-time") {
    return NextResponse.json({ error: "cadence must be daily, weekly, or one-time." }, { status: 400 });
  }
  if (kind !== "task" && kind !== "habit") return NextResponse.json({ error: "kind must be task or habit." }, { status: 400 });
  if (typeof xp !== "number" || !Number.isFinite(xp) || xp < 0 || xp > 100000) {
    return NextResponse.json({ error: "xp must be a number between 0 and 100000." }, { status: 400 });
  }
  if (scheduledDate !== undefined && scheduledDate !== null &&
      (typeof scheduledDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate))) {
    return NextResponse.json({ error: "scheduledDate must use YYYY-MM-DD." }, { status: 400 });
  }

  try {
    const { snapshot, version } = await loadSnapshot();
    const quests = parseCollection(typeof snapshot[QUESTS_KEY] === "string"
      ? snapshot[QUESTS_KEY] as string
      : JSON.stringify(snapshot[QUESTS_KEY] ?? []));
    const now = new Date().toISOString();
    const quest: Quest = {
      id: crypto.randomUUID(),
      title,
      description: typeof input.description === "string" ? input.description.slice(0, 2000) : "",
      categoryId,
      xp: Math.floor(xp),
      cadence,
      importance: input.importance === "bonus" ? "bonus" : "core",
      kind,
      status: "active",
      ...(typeof scheduledDate === "string" ? { scheduledDate } : {}),
      createdAt: now,
      updatedAt: now,
    };
    await saveQuestCollection(snapshot, version, [...quests, quest]);
    return NextResponse.json({ quest: toPublicQuest(quest), saved: true }, { status: 201 });
  } catch (error) {
    const conflict = !!error && typeof error === "object" && "code" in error && error.code === "CONFLICT";
    if (!conflict) console.error("[atlas-connector] create failed", error);
    return NextResponse.json(
      { error: conflict ? "Atlas data changed during this request. Retry the action." : "Unable to create the Atlas quest." },
      { status: conflict ? 409 : 500 },
    );
  }
}
