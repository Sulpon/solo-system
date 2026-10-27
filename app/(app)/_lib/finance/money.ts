// Money as integer minor units (cents, tiyn) plus an ISO currency code.
//
// Never floats: a statement total of 15 707.13 is 1570713 here, and every
// sum in Atlas Finance is integer addition. Parsing works on the digit
// string directly, so "0.1 + 0.2" style drift can never enter a balance.

// Currencies whose minor unit is not 1/100. Everything else is 2 decimals,
// which covers every currency the supported banks report in.
const MINOR_UNIT_EXPONENT: Readonly<Record<string, number>> = {
  JPY: 0,
  KRW: 0,
  HUF: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
};

export function currencyExponent(currency: string): number {
  return MINOR_UNIT_EXPONENT[currency.toUpperCase()] ?? 2;
}

// Symbols that unambiguously name one currency. "$" is taken as USD
// because every statement format Atlas parses that prints "$" means USD;
// "¥" is deliberately absent (JPY or CNY).
const SYMBOL_TO_CURRENCY: Readonly<Record<string, string>> = {
  "€": "EUR",
  $: "USD",
  "£": "GBP",
  "₸": "KZT",
  "₽": "RUB",
  "₴": "UAH",
  "₺": "TRY",
  "₹": "INR",
  "zł": "PLN",
  "Kč": "CZK",
};

const CURRENCY_CODE_PATTERN = /\b([A-Z]{3})\b/;
const SPACE_CHARACTERS = /[\s    ']/g;

export type ParsedAmount = Readonly<{
  minor: number;
  currency: string | null;
}>;

export function detectCurrency(text: string): string | null {
  for (const [symbol, code] of Object.entries(SYMBOL_TO_CURRENCY)) {
    if (text.includes(symbol)) {
      return code;
    }
  }

  const code = CURRENCY_CODE_PATTERN.exec(text);
  return code ? code[1] : null;
}

// Decides which separator, if any, is the decimal point.
//
//   "1,500.00"  -> "."      "1.500,00" -> ","
//   "15 707.13" -> "."      "1 115,48" -> ","
//   "36 660"    -> none     "12.5"     -> "."
//   "1,500"     -> none     (three digits after a lone separator are a
//                            thousands group: statements always print
//                            cents when they have them)
function findDecimalSeparator(digits: string): "." | "," | null {
  const lastDot = digits.lastIndexOf(".");
  const lastComma = digits.lastIndexOf(",");

  if (lastDot === -1 && lastComma === -1) {
    return null;
  }

  if (lastDot !== -1 && lastComma !== -1) {
    return lastDot > lastComma ? "." : ",";
  }

  const separator = lastDot !== -1 ? "." : ",";
  const occurrences = digits.split(separator).length - 1;
  const decimals = digits.length - digits.lastIndexOf(separator) - 1;

  if (occurrences === 1 && decimals >= 1 && decimals <= 2) {
    return separator;
  }

  return null;
}

// Parses a printed amount into signed minor units. Returns null for
// anything that is not unambiguously a number - a parser must never guess
// a financial value.
//
// Sign comes from a leading "-" / "−" / "+" or accounting parentheses.
// Statements that print direction in a separate column pass unsigned
// text here and apply the sign themselves.
export function parseAmount(raw: string, fallbackCurrency: string | null = null): ParsedAmount | null {
  const text = raw.trim();

  if (!text) {
    return null;
  }

  const currency = detectCurrency(text) ?? fallbackCurrency;
  let negative = /^[(]/.test(text) && /[)]$/.test(text);

  // Strip currency symbols and codes, keep only sign, digits and separators.
  let body = text.replace(/[A-Z]{3}/g, "");
  for (const symbol of Object.keys(SYMBOL_TO_CURRENCY)) {
    body = body.split(symbol).join("");
  }
  body = body.replace(/[()]/g, "").replace(SPACE_CHARACTERS, "");

  if (/^[-−–]/.test(body)) {
    negative = true;
    body = body.slice(1);
  } else if (body.startsWith("+")) {
    body = body.slice(1);
  }

  // A trailing minus ("12.00-") is how some banks print debits.
  if (/[-−–]$/.test(body)) {
    negative = true;
    body = body.slice(0, -1);
  }

  if (!/^\d[\d.,]*$/.test(body) || /[.,]{2}/.test(body) || /[.,]$/.test(body)) {
    return null;
  }

  const decimalSeparator = findDecimalSeparator(body);
  let integerPart = body;
  let fractionPart = "";

  if (decimalSeparator) {
    const index = body.lastIndexOf(decimalSeparator);
    integerPart = body.slice(0, index);
    fractionPart = body.slice(index + 1);
  }

  // Whatever separators remain are thousands separators, and real
  // thousands groups are exactly three digits ("1.0050" is not a number).
  const groups = integerPart.split(/[.,]/);
  if (groups.length > 1 && (groups[0].length > 3 || groups.slice(1).some((group) => group.length !== 3))) {
    return null;
  }

  integerPart = groups.join("");

  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart)) {
    return null;
  }

  const exponent = currencyExponent(currency ?? "");

  if (fractionPart.length > exponent && /[1-9]/.test(fractionPart.slice(exponent))) {
    // More precision than the currency has (e.g. "1.005" EUR): refuse
    // rather than round a bank's figure.
    return null;
  }

  const fraction = fractionPart.slice(0, exponent).padEnd(exponent, "0");
  const minor = Number(integerPart + fraction);

  if (!Number.isSafeInteger(minor)) {
    return null;
  }

  return { minor: negative && minor !== 0 ? -minor : minor, currency };
}

// For forms: the user types a major-unit amount ("12.50", "12,50").
export function parseUserAmount(text: string, currency: string): number | null {
  const parsed = parseAmount(text, currency);
  return parsed ? parsed.minor : null;
}

export function minorToMajorString(minor: number, currency: string): string {
  const exponent = currencyExponent(currency);
  const negative = minor < 0;
  const digits = String(Math.abs(minor)).padStart(exponent + 1, "0");
  const integer = exponent === 0 ? digits : digits.slice(0, -exponent);
  const fraction = exponent === 0 ? "" : "." + digits.slice(-exponent);
  return (negative ? "-" : "") + integer + fraction;
}

const formatterCache = new Map<string, Intl.NumberFormat>();

export function formatMoney(minor: number, currency: string, options: Readonly<{ signed?: boolean; compact?: boolean }> = {}): string {
  const exponent = currencyExponent(currency);
  const key = `${currency}|${options.signed ? 1 : 0}|${options.compact ? 1 : 0}`;
  let formatter = formatterCache.get(key);

  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency,
        signDisplay: options.signed ? "exceptZero" : "auto",
        notation: options.compact ? "compact" : "standard",
        minimumFractionDigits: options.compact ? 0 : exponent,
        maximumFractionDigits: options.compact ? 1 : exponent,
      });
    } catch {
      // Unknown ISO code: still show a correct number.
      formatter = new Intl.NumberFormat("en-GB", { minimumFractionDigits: exponent, maximumFractionDigits: exponent, signDisplay: options.signed ? "exceptZero" : "auto" });
    }
    formatterCache.set(key, formatter);
  }

  // Division only for display, never for arithmetic.
  return formatter.format(minor / 10 ** exponent);
}

export function isCurrencyCode(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}
