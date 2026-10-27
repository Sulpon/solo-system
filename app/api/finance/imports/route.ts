import { NextResponse, type NextRequest } from "next/server";
import { createStatementImport } from "../../../(app)/_lib/finance/server/import-service";
import { authorizeFinanceRequest, jsonError } from "../../../(app)/_lib/finance/server/route-auth";

// POST /api/finance/imports - upload one statement (PDF or CSV), parse it
// on the server and return a preview for review. Nothing is added to the
// user's transactions until the preview is committed.

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const auth = await authorizeFinanceRequest();
  if (auth instanceof NextResponse) return auth;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError(400, "invalid_request", "The upload could not be read.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonError(400, "invalid_request", "No file was uploaded.");
  }

  const dateOrder = form.get("dateOrder");
  const result = await createStatementImport(
    auth.client,
    auth.userId,
    { name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) },
    {
      currency: String(form.get("currency") ?? "").toUpperCase().trim(),
      dateOrder: dateOrder === "mdy" || dateOrder === "ymd" ? dateOrder : "dmy",
      accountName: String(form.get("accountName") ?? ""),
    },
  );

  if (!result.ok) {
    return jsonError(result.status, result.code, result.message, result.importRecord ? { import: result.importRecord } : {});
  }

  return NextResponse.json(
    { import: result.value.importRecord, preview: result.value.preview, alreadyExisted: result.value.alreadyExisted },
    { status: result.value.alreadyExisted ? 200 : 201, headers: { "Cache-Control": "no-store" } },
  );
}
