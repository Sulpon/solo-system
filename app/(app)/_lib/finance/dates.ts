// Calendar dates as ISO "YYYY-MM-DD" strings.
//
// A bank date is a calendar day, not an instant. Keeping it a string means
// no timezone can ever move a 23:30 card payment into the next day, and
// string comparison is chronological comparison.

export type IsoDate = string;

const ENGLISH_MONTHS: Readonly<Record<string, number>> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6,
  jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

// Russian month names in every form statements use: nominative, genitive
// ("1 октября") and the abbreviated forms Revolut prints ("1 окт.",
// "5 июн.", "3 мая").
const RUSSIAN_MONTH_STEMS: ReadonlyArray<readonly [string, number]> = [
  ["янв", 1], ["фев", 2], ["мар", 3], ["апр", 4], ["мая", 5], ["май", 5], ["июн", 6], ["июл", 7],
  ["авг", 8], ["сен", 9], ["окт", 10], ["ноя", 11], ["дек", 12],
];

export function isValidDateParts(year: number, month: number, day: number): boolean {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < 1990 || year > 2100 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function toIsoDate(year: number, month: number, day: number): IsoDate | null {
  if (!isValidDateParts(year, month, day)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function expandYear(year: number): number {
  // Two-digit years on statements are always this century.
  return year < 100 ? 2000 + year : year;
}

export type NumericDateOrder = "dmy" | "mdy" | "ymd";

// "25.07.2023", "01.09.24", "25/07/2023", "2023-07-25".
export function parseNumericDate(text: string, order: NumericDateOrder = "dmy"): IsoDate | null {
  const trimmed = text.trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(trimmed);

  if (iso) {
    return toIsoDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  }

  const parts = /^(\d{1,4})[./-](\d{1,2})[./-](\d{1,4})$/.exec(trimmed);

  if (!parts) return null;

  const [a, b, c] = [Number(parts[1]), Number(parts[2]), Number(parts[3])];

  if (order === "ymd" || parts[1].length === 4) return toIsoDate(a, b, c);
  if (order === "mdy") return toIsoDate(expandYear(c), a, b);
  return toIsoDate(expandYear(c), b, a);
}

// "Nov 1, 2024", "November 1, 2024", "1 November 2024", "1 Nov 2024".
export function parseEnglishDate(text: string): IsoDate | null {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const monthFirst = /^([A-Za-z]{3,9})\.? (\d{1,2}),? (\d{4})$/.exec(trimmed);

  if (monthFirst) {
    const month = ENGLISH_MONTHS[monthFirst[1].toLowerCase()];
    return month ? toIsoDate(Number(monthFirst[3]), month, Number(monthFirst[2])) : null;
  }

  const dayFirst = /^(\d{1,2}) ([A-Za-z]{3,9})\.?,? (\d{4})$/.exec(trimmed);

  if (dayFirst) {
    const month = ENGLISH_MONTHS[dayFirst[2].toLowerCase()];
    return month ? toIsoDate(Number(dayFirst[3]), month, Number(dayFirst[1])) : null;
  }

  return null;
}

function russianMonth(word: string): number | null {
  const lowered = word.toLowerCase().replace(/\.$/, "");
  const match = RUSSIAN_MONTH_STEMS.find(([stem]) => lowered.startsWith(stem));
  return match ? match[1] : null;
}

// "1 окт. 2026г.", "27 октября 2026 г.", "3 мая 2026г."
export function parseRussianDate(text: string): IsoDate | null {
  const trimmed = text.trim().replace(/\s+/g, " ");
  const match = /^(\d{1,2}) ([а-яё]+)\.? (\d{4})\s*(?:г\.?|года)?$/i.exec(trimmed);

  if (!match) return null;

  const month = russianMonth(match[2]);
  return month ? toIsoDate(Number(match[3]), month, Number(match[1])) : null;
}

export function parseAnyDate(text: string, order: NumericDateOrder = "dmy"): IsoDate | null {
  return parseNumericDate(text, order) ?? parseEnglishDate(text) ?? parseRussianDate(text);
}

// Finds "<date> ... <date>" period ranges in a sentence such as
// "Account transactions from November 1, 2024 to November 30, 2024" or
// "Операции по счету с 1 октября 2026г. по 27 октября 2026г.".
export function parsePeriodSentence(text: string): Readonly<{ start: IsoDate; end: IsoDate }> | null {
  const english = /from (.+?) to (.+?)$/i.exec(text.trim());

  if (english) {
    const start = parseEnglishDate(english[1]);
    const end = parseEnglishDate(english[2]);
    if (start && end) return { start, end };
  }

  const russian = /(?:^|\s)с (\d{1,2} [а-яё]+\.? \d{4}\s*г?\.?)\s*(?:по|–|-)\s*(\d{1,2} [а-яё]+\.? \d{4}\s*г?\.?)/i.exec(text.trim());

  if (russian) {
    const start = parseRussianDate(russian[1]);
    const end = parseRussianDate(russian[2]);
    if (start && end) return { start, end };
  }

  const russianDash = /(\d{1,2} [а-яё]+\.? \d{4}\s*г?\.?)\s*[–-]\s*(\d{1,2} [а-яё]+\.? \d{4}\s*г?\.?)/i.exec(text.trim());

  if (russianDash) {
    const start = parseRussianDate(russianDash[1]);
    const end = parseRussianDate(russianDash[2]);
    if (start && end) return { start, end };
  }

  const numeric = /(\d{1,2}[./]\d{1,2}[./]\d{2,4})\s*(?:-|–|по|to)\s*(\d{1,2}[./]\d{1,2}[./]\d{2,4})/i.exec(text);

  if (numeric) {
    const start = parseNumericDate(numeric[1]);
    const end = parseNumericDate(numeric[2]);
    if (start && end) return { start, end };
  }

  return null;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function partsOf(date: IsoDate): readonly [number, number, number] {
  return [Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10))];
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const [year, month, day] = partsOf(date);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

export function daysBetween(from: IsoDate, to: IsoDate): number {
  const [y1, m1, d1] = partsOf(from);
  const [y2, m2, d2] = partsOf(to);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

// "2026-10"
export type MonthKey = string;

export function monthKeyOf(date: IsoDate): MonthKey {
  return date.slice(0, 7);
}

export function startOfMonth(monthKey: MonthKey): IsoDate {
  return `${monthKey}-01`;
}

export function endOfMonth(monthKey: MonthKey): IsoDate {
  const [year, month] = [Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7))];
  return toIsoDate(year, month, daysInMonth(year, month)) as IsoDate;
}

export function shiftMonth(monthKey: MonthKey, delta: number): MonthKey {
  const [year, month] = [Number(monthKey.slice(0, 4)), Number(monthKey.slice(5, 7))];
  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return shifted.toISOString().slice(0, 7);
}

// Every month a range touches, oldest first.
export function monthsInRange(start: IsoDate, end: IsoDate): MonthKey[] {
  const months: MonthKey[] = [];
  let cursor = monthKeyOf(start);
  const last = monthKeyOf(end);

  while (cursor <= last && months.length < 600) {
    months.push(cursor);
    cursor = shiftMonth(cursor, 1);
  }

  return months;
}

// Today as a local calendar date (the user's day, not UTC's).
export function todayIso(now: Date = new Date()): IsoDate {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function isWithin(date: IsoDate, start: IsoDate | null, end: IsoDate | null): boolean {
  return (!start || date >= start) && (!end || date <= end);
}
