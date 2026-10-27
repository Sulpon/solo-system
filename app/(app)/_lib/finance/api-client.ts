import type { CommitDecisions, ImportPreview } from "./import-preview";
import type { StatementImport } from "./types";

// Browser calls to the finance route handlers. Uploads use XMLHttpRequest
// rather than fetch because only XHR reports upload progress.

export type ApiError = Readonly<{ code: string; message: string }>;

export type UploadResult =
  | Readonly<{ ok: true; importRecord: StatementImport; preview: ImportPreview | null; alreadyExisted: boolean }>
  | Readonly<{ ok: false; error: ApiError; importRecord: StatementImport | null }>;

export type CsvFormOptions = Readonly<{ currency: string; dateOrder: "dmy" | "mdy" | "ymd"; accountName: string }>;

const NETWORK_ERROR: ApiError = { code: "network", message: "Atlas could not reach the server. Check your connection and try again." };

export function uploadStatement(
  file: File,
  csv: CsvFormOptions,
  onProgress: (fraction: number) => void,
  signal: AbortSignal,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest();
    const form = new FormData();
    form.set("file", file);
    form.set("currency", csv.currency);
    form.set("dateOrder", csv.dateOrder);
    form.set("accountName", csv.accountName);

    request.open("POST", "/api/finance/imports");
    request.responseType = "json";
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    request.onload = () => {
      const body = request.response as { import?: StatementImport; preview?: ImportPreview | null; alreadyExisted?: boolean; error?: ApiError } | null;
      if (request.status >= 200 && request.status < 300 && body?.import) {
        resolve({ ok: true, importRecord: body.import, preview: body.preview ?? null, alreadyExisted: Boolean(body.alreadyExisted) });
      } else {
        resolve({ ok: false, error: body?.error ?? NETWORK_ERROR, importRecord: body?.import ?? null });
      }
    };
    request.onerror = () => resolve({ ok: false, error: NETWORK_ERROR, importRecord: null });
    request.onabort = () => resolve({ ok: false, error: { code: "cancelled", message: "Upload cancelled." }, importRecord: null });
    signal.addEventListener("abort", () => request.abort(), { once: true });
    request.send(form);
  });
}

async function call<T>(url: string, init: RequestInit): Promise<Readonly<{ ok: true; value: T } | { ok: false; error: ApiError }>> {
  try {
    const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
    const body = (await response.json().catch(() => null)) as (T & { error?: ApiError }) | null;
    if (!response.ok || !body) return { ok: false, error: body?.error ?? NETWORK_ERROR };
    return { ok: true, value: body };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}

export function commitImport(importId: string, decisions: CommitDecisions) {
  return call<{ import: StatementImport; inserted: number; skipped: number }>(`/api/finance/imports/${importId}/commit`, { method: "POST", body: JSON.stringify(decisions) });
}

export function deleteImport(importId: string) {
  return call<{ deletedTransactions: number }>(`/api/finance/imports/${importId}`, { method: "DELETE" });
}
