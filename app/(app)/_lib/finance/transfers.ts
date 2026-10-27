import { daysBetween } from "./dates";
import type { FinanceCategory, FinanceTransaction, TransferLink } from "./types";

// Money moving between the user's own accounts is neither income nor
// spending. Two statements describe the same move in their own words
// ("MOBILE BANK" out of one bank, "Alex Example" into another), so the
// pair can only be known for certain by the user.
//
// Atlas therefore only SUGGESTS pairs; linking is always a user action,
// and equal amounts alone are never enough for a suggestion - one side
// must already be categorised as a transfer or exchange.

export type LinkKind = TransferLink["kind"];

export function validateTransferLink(outgoing: FinanceTransaction, incoming: FinanceTransaction, kind: LinkKind): string | null {
  if (outgoing.id === incoming.id) return "A transaction cannot be linked to itself.";
  if (outgoing.amountMinor >= 0) return "The outgoing side must be money leaving an account.";
  if (incoming.amountMinor <= 0) return "The incoming side must be money arriving in an account.";
  if (outgoing.accountId === incoming.accountId) return "A transfer links two different accounts.";
  if (kind === "transfer" && outgoing.currency !== incoming.currency) return "These are in different currencies: link them as an exchange.";
  if (kind === "exchange" && outgoing.currency === incoming.currency) return "An exchange links two different currencies.";
  return null;
}

export type TransferSuggestion = Readonly<{
  outgoing: FinanceTransaction;
  incoming: FinanceTransaction;
  kind: LinkKind;
  daysApart: number;
}>;

const MAX_DAYS_APART = 3;

function isMovementCategory(transaction: FinanceTransaction, categoriesById: ReadonlyMap<string, FinanceCategory>): boolean {
  const kind = transaction.categoryId ? categoriesById.get(transaction.categoryId)?.kind : undefined;
  return kind === "transfer" || kind === "exchange";
}

export function suggestTransferPairs(
  transactions: ReadonlyArray<FinanceTransaction>,
  links: ReadonlyArray<TransferLink>,
  categories: ReadonlyArray<FinanceCategory>,
): TransferSuggestion[] {
  const linked = new Set(links.flatMap((link) => [link.outgoingTransactionId, link.incomingTransactionId]));
  const categoriesById = new Map(categories.map((category) => [category.id, category]));
  const outgoing = transactions.filter((transaction) => transaction.amountMinor < 0 && !linked.has(transaction.id));
  const incoming = transactions.filter((transaction) => transaction.amountMinor > 0 && !linked.has(transaction.id));
  const candidates: TransferSuggestion[] = [];

  for (const out of outgoing) {
    for (const into of incoming) {
      if (out.accountId === into.accountId) continue;

      const daysApart = Math.abs(daysBetween(out.bookedOn, into.bookedOn));
      if (daysApart > MAX_DAYS_APART) continue;

      const outIsMovement = isMovementCategory(out, categoriesById);
      const inIsMovement = isMovementCategory(into, categoriesById);

      if (out.currency === into.currency) {
        if (-out.amountMinor === into.amountMinor && (outIsMovement || inIsMovement)) {
          candidates.push({ outgoing: out, incoming: into, kind: "transfer", daysApart });
        }
      } else if (outIsMovement && inIsMovement && daysApart <= 1) {
        // Different currencies cannot be compared without a rate, so an
        // exchange is only suggested when BOTH sides are already marked as
        // a movement and fall on (nearly) the same day.
        candidates.push({ outgoing: out, incoming: into, kind: "exchange", daysApart });
      }
    }
  }

  // Closest pairs first; each transaction appears in one suggestion at most.
  candidates.sort((first, second) => first.daysApart - second.daysApart || first.outgoing.bookedOn.localeCompare(second.outgoing.bookedOn));
  const used = new Set<string>();

  return candidates.filter((candidate) => {
    if (used.has(candidate.outgoing.id) || used.has(candidate.incoming.id)) return false;
    used.add(candidate.outgoing.id);
    used.add(candidate.incoming.id);
    return true;
  });
}
