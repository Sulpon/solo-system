// Text normalisation shared by parsing, categorisation, duplicate
// detection and required-payment matching. One definition, so a merchant
// that matches a rule also fingerprints and matches the same way.

// Lowercase, accents removed ("Alí" -> "ali"), punctuation to spaces,
// whitespace collapsed. Cyrillic is kept: Kazakh and Russian statements
// are matched in their own script.
export function normalizeText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-z0-9а-я]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Payment-processor prefixes that precede the real merchant on card
// lines ("SQ *BLUE BOTTLE", "PAYPAL *SPOTIFY", "Nyx*brucospolsro").
const PROCESSOR_PREFIXES = /^(sq|sumup|sp|pp|paypal|nyx|globdat|zettle|izettle|tst|ccbill|google|apple pay)\s*\*\s*/i;

// Normalised merchant identity: what a correction rule or a fingerprint
// should treat as "the same merchant". Long digit runs (store numbers,
// terminal ids, phone numbers) are dropped so "Delikomat Cz 47493" and
// "Delikomat Cz 50341" are one merchant.
export function normalizeMerchant(text: string): string {
  return normalizeText(text.replace(PROCESSOR_PREFIXES, ""))
    .replace(/\b\d{3,}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// For display only: a cleaned, still human-cased merchant name.
export function cleanMerchantName(text: string): string {
  return text
    .replace(PROCESSOR_PREFIXES, "")
    // Account numbers / IBANs never become part of a merchant name.
    .replace(/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g, "")
    .replace(/\(\s*\d{5,}\s*\)/g, "")
    .replace(/\b\d{7,}\b/g, "")
    .replace(/\s+/g, " ")
    .replace(/[\s,:;-]+$/, "")
    .trim();
}

// Keyword test anchored at the start of a word, so "sport" never matches
// inside "transport" while "mcdonald" still matches "mcdonalds". Keywords
// of four letters or fewer must be a whole word ("tim" the Italian
// carrier, not "timothy"; "spar" the supermarket, not "sparkasse").
export function containsKeyword(normalizedHaystack: string, normalizedKeyword: string): boolean {
  if (!normalizedKeyword) return false;

  if (normalizedKeyword.length <= 4) {
    return ` ${normalizedHaystack} `.includes(` ${normalizedKeyword} `);
  }

  return ` ${normalizedHaystack}`.includes(` ${normalizedKeyword}`);
}

// Account numbers are never stored in full: "LT000000000000001234" ->
// "•••• 1234".
export function maskAccountNumber(value: string | null | undefined): string | null {
  const compact = (value ?? "").replace(/\s+/g, "");

  if (compact.length < 4) {
    return null;
  }

  return `•••• ${compact.slice(-4)}`;
}

// Deterministic, platform-independent 53-bit string hash (cyrb53). Used
// for transaction fingerprints, which must be identical whether computed
// in the browser or on the server. Not a security primitive.
export function hashString(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;

  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, "0");
}
