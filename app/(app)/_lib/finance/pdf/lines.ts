// A PDF has no lines, only positioned text fragments. Statement tables are
// recovered by grouping fragments that share a baseline into a line, and
// keeping each fragment's x position so parsers can tell columns apart
// ("Money out" vs "Money in" is a matter of where the number sits, not
// what it says).

export type PdfTextItem = Readonly<{
  x: number;
  y: number;
  text: string;
}>;

export type PdfLineItem = Readonly<{
  x: number;
  text: string;
}>;

export type PdfLine = Readonly<{
  page: number;
  y: number;
  items: ReadonlyArray<PdfLineItem>;
  // Items joined with single spaces, for keyword matching.
  text: string;
}>;

export type PdfDocumentText = Readonly<{
  pageCount: number;
  lines: ReadonlyArray<PdfLine>;
}>;

// Fragments within this many points vertically are the same line. Real
// statements put a row's cells within ~1pt of each other; the next row is
// at least 8pt away.
const SAME_LINE_TOLERANCE = 2.5;

export function groupItemsIntoLines(items: ReadonlyArray<PdfTextItem>, page: number): PdfLine[] {
  const rows: Array<{ y: number; items: PdfLineItem[] }> = [];

  for (const item of items) {
    const text = item.text.replace(/\s+/g, " ").trim();

    if (!text) continue;

    const row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= SAME_LINE_TOLERANCE);

    if (row) {
      row.items.push({ x: item.x, text });
    } else {
      rows.push({ y: item.y, items: [{ x: item.x, text }] });
    }
  }

  // PDF y grows upwards: top of the page first.
  return rows
    .sort((first, second) => second.y - first.y)
    .map((row) => {
      const sorted = [...row.items].sort((first, second) => first.x - second.x);
      return { page, y: Math.round(row.y), items: sorted, text: sorted.map((item) => item.text).join(" ") };
    });
}

// Convenience for tests and fixtures: "[43]Nov 1, 2024 [125]To X [335]€7.00"
// -> a PdfLine. Mirrors exactly what groupItemsIntoLines produces.
export function lineFromMarkup(markup: string, page = 1, y = 0): PdfLine {
  const items: PdfLineItem[] = [];
  const pattern = /\[(\d+)\]([^[]*)/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(markup)) !== null) {
    const text = match[2].trim();
    if (text) items.push({ x: Number(match[1]), text });
  }

  return { page, y, items, text: items.map((item) => item.text).join(" ") };
}

// Fixture documents: "=== PAGE n" separates pages, every other non-empty
// line is one PdfLine in markup form.
export function documentFromMarkup(markup: string): PdfDocumentText {
  const lines: PdfLine[] = [];
  let page = 1;
  let y = 1000;

  for (const raw of markup.split(/\r?\n/)) {
    const pageMatch = /^=== PAGE (\d+)/.exec(raw.trim());

    if (pageMatch) {
      page = Number(pageMatch[1]);
      y = 1000;
      continue;
    }

    if (!raw.trim()) continue;

    lines.push(lineFromMarkup(raw, page, y));
    y -= 10;
  }

  return { pageCount: page, lines };
}

export function documentText(document: PdfDocumentText, page?: number): string {
  return document.lines
    .filter((line) => page === undefined || line.page === page)
    .map((line) => line.text)
    .join("\n");
}
