import { NextResponse, type NextRequest } from "next/server";
import { commitStatementImport, parseCommitDecisions } from "../../../../../(app)/_lib/finance/server/import-service";
import { authorizeFinanceRequest, isUuid, jsonError } from "../../../../../(app)/_lib/finance/server/route-auth";

// POST /api/finance/imports/:importId/commit - save a reviewed preview.
// The body carries only the user's decisions (which lines, which
// categories, which account); amounts and dates are read from the stored
// preview, so a modified request cannot alter what the bank reported.
// Idempotent and safe to retry.

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ importId: string }> }): Promise<NextResponse> {
  const auth = await authorizeFinanceRequest();
  if (auth instanceof NextResponse) return auth;

  const { importId } = await context.params;
  if (!isUuid(importId)) return jsonError(404, "not_found", "This import no longer exists.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_request", "The commit request could not be read.");
  }

  const decisions = parseCommitDecisions(body);
  if (!decisions) return jsonError(400, "invalid_request", "The commit request is malformed.");

  const result = await commitStatementImport(auth.client, auth.userId, importId, decisions);
  if (!result.ok) return jsonError(result.status, result.code, result.message);

  return NextResponse.json({ import: result.value.importRecord, inserted: result.value.inserted, skipped: result.value.skipped }, { headers: { "Cache-Control": "no-store" } });
}
