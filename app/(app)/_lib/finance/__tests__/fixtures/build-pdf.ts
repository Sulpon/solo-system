import { documentFromMarkup } from "../../pdf/lines";

// Writes a minimal, valid PDF with text placed at exact positions, so the
// real extraction path (pdf.js -> lines -> parser) can be tested without
// committing any real statement file. Helvetica with WinAnsi encoding
// covers the Latin fixtures, including "€".

type PlacedText = Readonly<{ x: number; y: number; text: string }>;

function escapePdfString(text: string): string {
  return [...text]
    .map((char) => {
      if (char === "€") return "\\200";
      if (char === "\\" || char === "(" || char === ")") return `\\${char}`;
      const code = char.charCodeAt(0);
      // WinAnsi equals Latin-1 for 160-255 ("©", "é" ...).
      if (code >= 160 && code <= 255) return `\\${code.toString(8)}`;
      if (code < 32 || code > 126) throw new Error(`Character not supported by the fixture PDF writer: ${char}`);
      return char;
    })
    .join("");
}

export function buildPdf(pages: ReadonlyArray<ReadonlyArray<PlacedText>>): Uint8Array {
  const objects: string[] = [];
  const pageIds: number[] = [];
  // 1 catalog, 2 pages tree, 3 font, then (page, content) pairs.
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";

  pages.forEach((items, index) => {
    const pageId = 4 + index * 2;
    const contentId = pageId + 1;
    const stream = items.map((item) => `BT /F1 8 Tf 1 0 0 1 ${item.x} ${item.y} Tm (${escapePdfString(item.text)}) Tj ET`).join("\n");
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    pageIds.push(pageId);
  });

  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let body = "%PDF-1.4\n";
  const offsets: number[] = [];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = body.length;
  body += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    body += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return new Uint8Array([...body].map((char) => char.charCodeAt(0)));
}

// A fixture in "[x]text" markup, laid out top to bottom 12pt apart, as a PDF.
export function pdfFromMarkup(markup: string): Uint8Array {
  const document = documentFromMarkup(markup);
  const pages: PlacedText[][] = Array.from({ length: document.pageCount }, () => []);
  const linesOnPage = new Array<number>(document.pageCount).fill(0);

  for (const line of document.lines) {
    const pageIndex = line.page - 1;
    const y = 800 - linesOnPage[pageIndex] * 12;
    linesOnPage[pageIndex] += 1;
    for (const item of line.items) pages[pageIndex].push({ x: item.x, y, text: item.text });
  }

  return buildPdf(pages);
}
