import { daysBetween, daysInMonth, endOfMonth, startOfMonth, toIsoDate, type IsoDate, type MonthKey } from "./dates";
import { normalizeText } from "./text";
import type { FinanceTransaction, RequiredPayment, RequiredPaymentCheck } from "./types";

// Required monthly payments: rent, phone, a loan, a subscription.
//
// Paid-ness for a month is decided in this order:
//   1. A manual check for that month, either way. "Paid" covers cash and
//      payments from accounts Atlas does not see; "not paid" rejects a
//      wrong automatic match.
//   2. An imported transaction that month that matches the payment's
//      text (and amount, if one is set) - Atlas ticking it off by itself
//      as statements arrive.
//   3. Otherwise unpaid, and the deadline decides how urgent that is.

export type PaymentUrgency = "paid" | "overdue" | "due-today" | "due-soon" | "upcoming";

export type RequiredPaymentStatus = Readonly<{
  payment: RequiredPayment;
  month: MonthKey;
  dueDate: IsoDate;
  isPaid: boolean;
  source: "manual" | "statement" | null;
  matchedTransaction: FinanceTransaction | null;
  // Set when the user marked it unpaid despite a matching transaction.
  rejectedMatch: FinanceTransaction | null;
  urgency: PaymentUrgency;
  // Negative once the due date has passed.
  daysUntilDue: number;
}>;

const DUE_SOON_DAYS = 3;

// Day 31 in a 30-day month is the 30th; day 29-31 in February is its last day.
export function dueDateFor(payment: Pick<RequiredPayment, "dueDay">, month: MonthKey): IsoDate {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  return toIsoDate(year, monthNumber, Math.min(payment.dueDay, daysInMonth(year, monthNumber))) as IsoDate;
}

export function transactionMatchesPayment(payment: RequiredPayment, transaction: FinanceTransaction): boolean {
  if (!payment.matchPattern?.trim()) return false;
  if (transaction.amountMinor >= 0) return false;
  if (payment.accountId && transaction.accountId !== payment.accountId) return false;
  if (payment.currency && transaction.currency !== payment.currency) return false;

  const pattern = normalizeText(payment.matchPattern);
  const haystack = normalizeText(`${transaction.merchant ?? ""} ${transaction.descriptionOriginal}`);

  if (!pattern || !haystack.includes(pattern)) return false;

  if (payment.expectedAmountMinor !== null) {
    const amount = Math.abs(transaction.amountMinor);
    const tolerance = Math.round((payment.expectedAmountMinor * payment.amountTolerancePct) / 100);
    if (Math.abs(amount - payment.expectedAmountMinor) > tolerance) return false;
  }

  return true;
}

export function resolveRequiredPaymentStatus(
  payment: RequiredPayment,
  month: MonthKey,
  transactions: ReadonlyArray<FinanceTransaction>,
  checks: ReadonlyArray<RequiredPaymentCheck>,
  today: IsoDate,
): RequiredPaymentStatus {
  const dueDate = dueDateFor(payment, month);
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const check = checks.find((candidate) => candidate.requiredPaymentId === payment.id && candidate.periodMonth === monthStart);
  const match =
    transactions
      .filter((transaction) => transaction.bookedOn >= monthStart && transaction.bookedOn <= monthEnd && transactionMatchesPayment(payment, transaction))
      .sort((first, second) => first.bookedOn.localeCompare(second.bookedOn))[0] ?? null;

  const isPaid = check ? check.status === "paid" : match !== null;
  const source = check ? "manual" : match ? "statement" : null;
  const daysUntilDue = daysBetween(today, dueDate);

  let urgency: PaymentUrgency = "upcoming";
  if (isPaid) urgency = "paid";
  else if (daysUntilDue < 0) urgency = "overdue";
  else if (daysUntilDue === 0) urgency = "due-today";
  else if (daysUntilDue <= DUE_SOON_DAYS) urgency = "due-soon";

  return {
    payment,
    month,
    dueDate,
    isPaid,
    source,
    matchedTransaction: check?.status === "unpaid" ? null : match,
    rejectedMatch: check?.status === "unpaid" ? match : null,
    urgency,
    daysUntilDue,
  };
}

const URGENCY_ORDER: Readonly<Record<PaymentUrgency, number>> = { overdue: 0, "due-today": 1, "due-soon": 2, upcoming: 3, paid: 4 };

export function resolveAllRequiredPayments(
  payments: ReadonlyArray<RequiredPayment>,
  month: MonthKey,
  transactions: ReadonlyArray<FinanceTransaction>,
  checks: ReadonlyArray<RequiredPaymentCheck>,
  today: IsoDate,
): RequiredPaymentStatus[] {
  return payments
    .filter((payment) => payment.isActive)
    .map((payment) => resolveRequiredPaymentStatus(payment, month, transactions, checks, today))
    .sort(
      (first, second) =>
        URGENCY_ORDER[first.urgency] - URGENCY_ORDER[second.urgency] ||
        first.dueDate.localeCompare(second.dueDate) ||
        first.payment.sortOrder - second.payment.sortOrder ||
        first.payment.name.localeCompare(second.payment.name),
    );
}
