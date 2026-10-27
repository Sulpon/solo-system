import { daysBetween, type IsoDate } from "./dates";
import { hashString, normalizeText } from "./text";
import type { TransactionSource } from "./types";

// Duplicate prevention.
//
// IDENTITY. A transaction's fingerprint is a hash of what the bank says
// about it: date, signed amount, currency, normalised description and the
// bank reference when there is one (Alatau reuses one reference for a
// transfer AND its fee, so the reference is part of the identity, never
// all of it). Combined with the account and an occurrence number, it is
// unique in the database:
//
//   (account, fingerprint, occurrence)
//
// OCCURRENCE. Two genuinely identical lines - two €0.45 vending coffees
// the same day - share a fingerprint. Numbering them 1, 2 in statement
// order keeps both, while importing the same statement again produces the
// same 1, 2 and adds nothing. Overlapping statements agree too, because a
// statement always covers whole days.
//
// CERTAINTY. Only an exact (fingerprint, occurrence) match is treated as
// "already imported". Anything merely similar is shown to the user as a
// POSSIBLE duplicate and never dropped automatically.

export const FINGERPRINT_VERSION = "v1";

export type FingerprintInput = Readonly<{
  bookedOn: IsoDate;
  amountMinor: number;
  currency: string;
  description: string;
  reference: string | null;
}>;

export function transactionFingerprint(input: FingerprintInput): string {
  const key = [input.bookedOn, String(input.amountMinor), input.currency, normalizeText(input.description), normalizeText(input.reference ?? "")].join("|");
  return `${FINGERPRINT_VERSION}:${hashString(key)}${hashString(key, 1)}`;
}

// Numbers identical fingerprints 1, 2, 3 ... in the order given.
export function assignOccurrences(fingerprints: ReadonlyArray<string>): number[] {
  const seen = new Map<string, number>();

  return fingerprints.map((fingerprint) => {
    const occurrence = (seen.get(fingerprint) ?? 0) + 1;
    seen.set(fingerprint, occurrence);
    return occurrence;
  });
}

export type DuplicateCandidate = Readonly<{
  bookedOn: IsoDate;
  amountMinor: number;
  currency: string;
  fingerprint: string;
  occurrence: number;
}>;

export type ExistingTransactionForDedupe = Readonly<{
  id: string;
  bookedOn: IsoDate;
  amountMinor: number;
  currency: string;
  fingerprint: string;
  occurrence: number;
  source: TransactionSource;
}>;

export type DuplicateStatus = "new" | "exact" | "possible";

export type DuplicateVerdict = Readonly<{
  status: DuplicateStatus;
  matchId: string | null;
}>;

// A manual entry is often dated a day or two off the bank's booking date.
const MANUAL_MATCH_WINDOW_DAYS = 3;

// Classifies every candidate against the transactions already stored on
// the SAME account. Each existing transaction can explain at most one
// candidate, so three identical new lines against one stored line yield
// one match and two new.
export function classifyDuplicates(candidates: ReadonlyArray<DuplicateCandidate>, existing: ReadonlyArray<ExistingTransactionForDedupe>): DuplicateVerdict[] {
  const exactIndex = new Map(existing.map((transaction) => [`${transaction.fingerprint}#${transaction.occurrence}`, transaction.id]));
  const claimed = new Set<string>();
  const verdicts: DuplicateVerdict[] = candidates.map((candidate) => {
    const exact = exactIndex.get(`${candidate.fingerprint}#${candidate.occurrence}`);

    if (exact) {
      claimed.add(exact);
      return { status: "exact", matchId: exact };
    }

    return { status: "new", matchId: null };
  });

  return verdicts.map((verdict, index) => {
    if (verdict.status === "exact") return verdict;

    const candidate = candidates[index];
    const match = existing.find((transaction) => {
      if (claimed.has(transaction.id)) return false;
      if (transaction.amountMinor !== candidate.amountMinor || transaction.currency !== candidate.currency) return false;
      if (transaction.fingerprint === candidate.fingerprint) return false;

      const distance = Math.abs(daysBetween(transaction.bookedOn, candidate.bookedOn));
      return transaction.source === "manual" ? distance <= MANUAL_MATCH_WINDOW_DAYS : distance === 0;
    });

    if (!match) return verdict;

    claimed.add(match.id);
    return { status: "possible", matchId: match.id };
  });
}
