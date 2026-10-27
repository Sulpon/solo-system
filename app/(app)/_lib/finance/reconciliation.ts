import { formatMoney } from "./money";
import type { ParsedSection, StatementIssue } from "./parsers/types";

// Opening balance + credits - debits = closing balance.
//
// The check is reported, never enforced: a mismatch is shown with its
// exact difference and the statement is flagged for review. Nothing here
// adjusts a transaction or a balance to make the numbers agree.

export type ReconciliationStatus = "balanced" | "mismatch" | "unverifiable";

export type ReconciliationResult = Readonly<{
  status: ReconciliationStatus;
  creditsMinor: number;
  debitsMinor: number;
  // Closing balance implied by the extracted lines, when the opening is known.
  expectedClosingMinor: number | null;
  // reported closing - expected closing. Zero when balanced.
  differenceMinor: number | null;
}>;

export function sumCreditsAndDebits(amounts: ReadonlyArray<number>): Readonly<{ creditsMinor: number; debitsMinor: number }> {
  let creditsMinor = 0;
  let debitsMinor = 0;

  for (const amount of amounts) {
    if (amount > 0) creditsMinor += amount;
    else debitsMinor += -amount;
  }

  return { creditsMinor, debitsMinor };
}

export function reconcile(openingMinor: number | null, closingMinor: number | null, amounts: ReadonlyArray<number>): ReconciliationResult {
  const { creditsMinor, debitsMinor } = sumCreditsAndDebits(amounts);

  if (openingMinor === null || closingMinor === null) {
    return { status: "unverifiable", creditsMinor, debitsMinor, expectedClosingMinor: null, differenceMinor: null };
  }

  const expectedClosingMinor = openingMinor + creditsMinor - debitsMinor;
  const differenceMinor = closingMinor - expectedClosingMinor;

  return { status: differenceMinor === 0 ? "balanced" : "mismatch", creditsMinor, debitsMinor, expectedClosingMinor, differenceMinor };
}

export function reconcileSection(section: ParsedSection): ReconciliationResult {
  return reconcile(
    section.balances.openingBalanceMinor,
    section.balances.closingBalanceMinor,
    section.transactions.map((transaction) => transaction.amountMinor),
  );
}

// Every independent arithmetic check a section supports, as issues:
//   1. opening + lines = closing
//   2. lines' credits/debits = the statement's own printed totals
//   3. each printed running balance = previous balance + this line
export function reconciliationIssues(section: ParsedSection): StatementIssue[] {
  const issues: StatementIssue[] = [];
  const currency = section.account.currency;
  const result = reconcileSection(section);

  if (result.status === "mismatch" && result.differenceMinor !== null) {
    issues.push({
      severity: "warning",
      code: "balance_mismatch",
      message: `Opening balance plus the extracted transactions does not reach the closing balance. Difference: ${formatMoney(result.differenceMinor, currency, { signed: true })}.`,
      sectionIndex: section.index,
      transactionIndex: null,
    });
  }

  if (result.status === "unverifiable") {
    issues.push({
      severity: "warning",
      code: "balances_missing",
      message: "This statement section does not print both an opening and a closing balance, so the extracted transactions cannot be checked against it.",
      sectionIndex: section.index,
      transactionIndex: null,
    });
  }

  const { reportedCreditsMinor, reportedDebitsMinor } = section.balances;
  // When opening + lines = closing, the lines are proven complete, and a
  // disagreement with the statement's printed per-type totals is the bank's
  // own bookkeeping (a reversal counted as a second purchase, say). Worth
  // showing, not worth blocking on.
  const totalsSeverity = result.status === "balanced" ? "info" : "warning";
  const totalsNote = result.status === "balanced" ? " The opening and closing balances do agree with the extracted lines." : "";

  if (reportedCreditsMinor !== null && reportedCreditsMinor !== result.creditsMinor) {
    issues.push({
      severity: totalsSeverity,
      code: "credits_mismatch",
      message: `The statement reports ${formatMoney(reportedCreditsMinor, currency)} received, but the extracted lines add up to ${formatMoney(result.creditsMinor, currency)}.${totalsNote}`,
      sectionIndex: section.index,
      transactionIndex: null,
    });
  }

  if (reportedDebitsMinor !== null && reportedDebitsMinor !== result.debitsMinor) {
    issues.push({
      severity: totalsSeverity,
      code: "debits_mismatch",
      message: `The statement reports ${formatMoney(reportedDebitsMinor, currency)} spent, but the extracted lines add up to ${formatMoney(result.debitsMinor, currency)}.${totalsNote}`,
      sectionIndex: section.index,
      transactionIndex: null,
    });
  }

  let previous = section.balances.openingBalanceMinor;

  section.transactions.forEach((transaction, transactionIndex) => {
    if (transaction.balanceAfterMinor === null) {
      previous = null;
      return;
    }

    if (previous !== null && previous + transaction.amountMinor !== transaction.balanceAfterMinor) {
      issues.push({
        severity: "warning",
        code: "running_balance_mismatch",
        message: `The running balance after this line (${formatMoney(transaction.balanceAfterMinor, currency)}) does not follow from the line before it.`,
        sectionIndex: section.index,
        transactionIndex,
      });
    }

    previous = transaction.balanceAfterMinor;
  });

  return issues;
}
