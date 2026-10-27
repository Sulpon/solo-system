// @vitest-environment node
import { describe, expect, it } from "vitest";
import { extractPdfText, PdfExtractionError } from "../pdf/extract-text";
import { documentFromMarkup } from "../pdf/lines";
import { parseStatementDocument } from "../parsers/registry";
import { buildPdf, pdfFromMarkup } from "./fixtures/build-pdf";
import { REVOLUT_EN } from "./fixtures/statements";

// The real extraction path, end to end, on PDFs generated from the
// sanitised fixture.

async function extractionFailure(bytes: Uint8Array): Promise<string> {
  try {
    await extractPdfText(bytes);
    return "none";
  } catch (error) {
    return error instanceof PdfExtractionError ? error.code : "unexpected";
  }
}

describe("PDF extraction", () => {
  it("reads a text PDF into the same statement the layout fixture describes", async () => {
    const document = await extractPdfText(pdfFromMarkup(REVOLUT_EN));
    const fromPdf = parseStatementDocument(document);
    const fromMarkup = parseStatementDocument(documentFromMarkup(REVOLUT_EN));

    expect(document.pageCount).toBe(2);
    expect(fromPdf.parserId).toBe("revolut");
    expect(fromPdf.sections.map((section) => section.transactions.map((transaction) => [transaction.bookedOn, transaction.amountMinor]))).toEqual(
      fromMarkup.sections.map((section) => section.transactions.map((transaction) => [transaction.bookedOn, transaction.amountMinor])),
    );
    expect(fromPdf.sections[0].balances).toEqual(fromMarkup.sections[0].balances);
    expect(fromPdf.sections.map((section) => section.account)).toEqual(fromMarkup.sections.map((section) => section.account));
  });

  it("detects an image-only (scanned) PDF instead of pretending it was read", async () => {
    expect(await extractionFailure(buildPdf([[]]))).toBe("no_text");
  });

  it("handles malformed files safely", async () => {
    const garbage = new TextEncoder().encode("%PDF-1.4\nthis is not really a pdf\n%%EOF");
    expect(await extractionFailure(garbage)).toBe("malformed");
    expect(await extractionFailure(new Uint8Array([1, 2, 3]))).toBe("malformed");
  });

  it("leaves the caller's bytes intact for storage", async () => {
    const bytes = pdfFromMarkup(REVOLUT_EN);
    const before = bytes.length;
    await extractPdfText(bytes);
    expect(bytes.length).toBe(before);
  });

  it("refuses a PDF that is not a supported statement", async () => {
    const document = await extractPdfText(buildPdf([[{ x: 40, y: 800, text: "Quarterly newsletter with plenty of words and no transactions at all" }]]));
    expect(() => parseStatementDocument(document)).toThrow(/not a statement format Atlas recognises/);
  });
});
