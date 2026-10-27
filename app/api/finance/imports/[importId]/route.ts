import { NextResponse, type NextRequest } from "next/server";
import { deleteStatementImport } from "../../../../(app)/_lib/finance/server/import-service";
import { authorizeFinanceRequest, isUuid, jsonError } from "../../../../(app)/_lib/finance/server/route-auth";

// DELETE /api/finance/imports/:importId - cancel a pending import, discard
// a failed one, or remove a committed one together with its transactions.
// Another user's id simply resolves to "not found" under RLS.

export const runtime = "nodejs";

export async function DELETE(_request: NextRequest, context: { params: Promise<{ importId: string }> }): Promise<NextResponse> {
  const auth = await authorizeFinanceRequest();
  if (auth instanceof NextResponse) return auth;

  const { importId } = await context.params;
  if (!isUuid(importId)) return jsonError(404, "not_found", "This import no longer exists.");

  const result = await deleteStatementImport(auth.client, auth.userId, importId);
  if (!result.ok) return jsonError(result.status, result.code, result.message);

  return NextResponse.json(result.value, { headers: { "Cache-Control": "no-store" } });
}
