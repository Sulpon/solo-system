import { getDocumentProxy } from "unpdf";
import { groupItemsIntoLines, type PdfDocumentText, type PdfLine } from "./lines";

// Server-side text extraction, imported only by the finance route
// handlers. Statements never leave the server for this: no OCR service,
// no AI, no third-party API - unpdf ships a self-contained build of
// Mozilla's pdf.js.

export const MAX_PDF_PAGES = 80;
const EXTRACTION_TIMEOUT_MS = 20_000;
// Below this many characters across the whole document, the PDF is
// treated as image-only (a scan or a photo).
const MIN_TEXT_CHARACTERS = 40;

export type PdfExtractionFailure = "malformed" | "encrypted" | "too_many_pages" | "no_text" | "timeout";

export class PdfExtractionError extends Error {
  constructor(readonly code: PdfExtractionFailure) {
    super(code);
    this.name = "PdfExtractionError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new PdfExtractionError("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

type TextContentItem = { str?: string; transform?: number[] };

async function extract(bytes: Uint8Array): Promise<PdfDocumentText> {
  let pdf: Awaited<ReturnType<typeof getDocumentProxy>>;

  try {
    pdf = await getDocumentProxy(bytes);
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    throw new PdfExtractionError(name === "PasswordException" ? "encrypted" : "malformed");
  }

  try {
    if (pdf.numPages > MAX_PDF_PAGES) {
      throw new PdfExtractionError("too_many_pages");
    }

    const lines: PdfLine[] = [];
    let characters = 0;

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const items = (content.items as TextContentItem[])
        .filter((item) => typeof item.str === "string" && Array.isArray(item.transform))
        .map((item) => ({ x: item.transform![4], y: item.transform![5], text: item.str! }));

      characters += items.reduce((sum, item) => sum + item.text.trim().length, 0);
      lines.push(...groupItemsIntoLines(items, pageNumber));
      page.cleanup();
    }

    if (characters < MIN_TEXT_CHARACTERS) {
      throw new PdfExtractionError("no_text");
    }

    return { pageCount: pdf.numPages, lines };
  } catch (error) {
    if (error instanceof PdfExtractionError) throw error;
    throw new PdfExtractionError("malformed");
  } finally {
    // Teardown lives on the loading task in this pdf.js build.
    void pdf.loadingTask?.destroy().catch(() => undefined);
  }
}

export async function extractPdfText(bytes: Uint8Array): Promise<PdfDocumentText> {
  // pdf.js may detach the buffer it is handed; give it a copy so the
  // caller's bytes (needed afterwards for storage) stay intact.
  return withTimeout(extract(new Uint8Array(bytes)), EXTRACTION_TIMEOUT_MS);
}
