import type { PdfDocumentText, PdfLine } from "../pdf/lines";
import { documentText } from "../pdf/lines";

// Text of the first page's header area: where a bank names itself. Used
// for detection so a bank merely MENTIONED in a transaction description
// ("Перевод клиенту Kaspi") never decides which parser runs.
export function firstPageHeader(document: PdfDocumentText, lineCount = 25): string {
  return document.lines
    .filter((line) => line.page === 1)
    .slice(0, lineCount)
    .map((line) => line.text)
    .join("\n");
}

export function fullText(document: PdfDocumentText): string {
  return documentText(document);
}

// IBANs and long account numbers inside descriptions are masked before
// anything is stored: "Riccardo Zanella, IT02C0306912154100000002641" ->
// "Riccardo Zanella, IT02•••• 2641".
export function maskAccountNumbersInText(text: string): string {
  return text.replace(/\b([A-Z]{2}\d{2})[A-Z0-9]{8,30}([A-Z0-9]{4})\b/g, "$1•••• $2").replace(/\b(\d{6})\*{4,}(\d{4})\b/g, "••••$2");
}

export function joinDescription(parts: ReadonlyArray<string | null | undefined>): string {
  return maskAccountNumbersInText(
    parts
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part))
      .join(" · "),
  ).slice(0, 1000);
}

// Memoises a parser's single pass over a document, so the four interface
// methods share one segmentation instead of re-walking the lines.
export function memoizeByDocument<T>(compute: (document: PdfDocumentText) => T): (document: PdfDocumentText) => T {
  const cache = new WeakMap<PdfDocumentText, T>();

  return (document) => {
    const cached = cache.get(document);
    if (cached !== undefined) return cached;
    const value = compute(document);
    cache.set(document, value);
    return value;
  };
}

export function firstItemX(line: PdfLine): number {
  return line.items[0]?.x ?? 0;
}
