// Server-side validation of an uploaded statement, before any parsing.
// The browser checks the same things for fast feedback, but only this
// check is trusted.

// Vercel's request body limit is 4.5 MB; statements are typically well
// under 1 MB, so 4 MB leaves headroom without inviting abuse.
export const MAX_STATEMENT_BYTES = 4 * 1024 * 1024;

export type UploadKind = "pdf" | "csv";

export type FileValidation = Readonly<{ ok: true; kind: UploadKind } | { ok: false; message: string }>;

const PDF_TYPES = new Set(["application/pdf", "application/x-pdf", ""]);
const CSV_TYPES = new Set(["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel", "text/comma-separated-values", ""]);

function startsWithPdfSignature(bytes: Uint8Array): boolean {
  // "%PDF-" must appear within the first 1024 bytes (the PDF spec allows
  // leading junk; real files have it at offset 0).
  const limit = Math.min(bytes.length - 5, 1024);
  for (let offset = 0; offset <= limit; offset += 1) {
    if (bytes[offset] === 0x25 && bytes[offset + 1] === 0x50 && bytes[offset + 2] === 0x44 && bytes[offset + 3] === 0x46 && bytes[offset + 4] === 0x2d) {
      return true;
    }
  }
  return false;
}

function looksLikeText(bytes: Uint8Array): boolean {
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  return !sample.includes(0);
}

export function validateStatementUpload(name: string, type: string, bytes: Uint8Array): FileValidation {
  if (bytes.length === 0) {
    return { ok: false, message: "The file is empty." };
  }

  if (bytes.length > MAX_STATEMENT_BYTES) {
    return { ok: false, message: "The file is larger than 4 MB. Statements are usually far smaller - check it is the right file." };
  }

  const extension = name.toLowerCase().split(".").pop() ?? "";

  if (extension === "pdf") {
    if (!PDF_TYPES.has(type)) return { ok: false, message: "The file is named .pdf but is not a PDF." };
    if (!startsWithPdfSignature(bytes)) return { ok: false, message: "The file is named .pdf but its contents are not a PDF." };
    return { ok: true, kind: "pdf" };
  }

  if (extension === "csv") {
    if (!CSV_TYPES.has(type)) return { ok: false, message: "The file is named .csv but is not a text file." };
    if (!looksLikeText(bytes)) return { ok: false, message: "The CSV file contains binary data." };
    return { ok: true, kind: "csv" };
  }

  return { ok: false, message: "Only PDF statements and CSV files can be imported." };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Display name only - storage paths never use it.
export function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_").trim();
  return (cleaned || "statement").slice(0, 200);
}
