import type { IsoDate } from "./dates";

// Domain types for Atlas Finance. The repository maps database rows to
// these; engines and components only ever see these.

export type CategoryKind = "expense" | "income" | "transfer" | "exchange" | "debt";

export type FinanceCategory = Readonly<{
  id: string;
  slug: string | null;
  name: string;
  kind: CategoryKind;
  color: string;
  isEnabled: boolean;
  isSystem: boolean;
  sortOrder: number;
}>;

export type FinanceAccount = Readonly<{
  id: string;
  name: string;
  bank: string;
  accountIdentifier: string | null;
  currency: string;
  product: string;
  isArchived: boolean;
}>;

export type RuleField = "merchant" | "description" | "any";
export type RuleMatchType = "contains" | "equals" | "starts_with";
export type Direction = "in" | "out";

export type CategoryRule = Readonly<{
  id: string;
  field: RuleField;
  matchType: RuleMatchType;
  pattern: string;
  accountId: string | null;
  direction: Direction | null;
  categoryId: string;
  priority: number;
  isEnabled: boolean;
  source: "user" | "correction";
  createdAt: string;
}>;

export type CategorizationMethod = "rule_user" | "rule_builtin" | "manual" | "none";
export type ReviewStatus = "needs_review" | "confirmed";
export type TransactionSource = "pdf" | "csv" | "manual";

export type FinanceTransaction = Readonly<{
  id: string;
  accountId: string;
  statementId: string | null;
  importId: string | null;
  bookedOn: IsoDate;
  postedOn: IsoDate | null;
  descriptionOriginal: string;
  merchant: string | null;
  amountMinor: number;
  currency: string;
  originalAmountMinor: number | null;
  originalCurrency: string | null;
  feeMinor: number | null;
  bankReference: string | null;
  categoryId: string | null;
  categorizationMethod: CategorizationMethod;
  categorizationRuleId: string | null;
  reviewStatus: ReviewStatus;
  source: TransactionSource;
  fingerprint: string;
  occurrence: number;
  possibleDuplicateOf: string | null;
  notes: string | null;
  createdAt: string;
}>;

export type TransferLink = Readonly<{
  id: string;
  outgoingTransactionId: string;
  incomingTransactionId: string;
  kind: "transfer" | "exchange";
  createdAt: string;
}>;

export type Budget = Readonly<{
  id: string;
  categoryId: string;
  currency: string;
  monthlyAmountMinor: number;
}>;

export type ImportStatus = "needs_review" | "committed" | "failed";

export type StatementImport = Readonly<{
  id: string;
  fileName: string;
  fileSize: number;
  fileType: "pdf" | "csv";
  bank: string | null;
  status: ImportStatus;
  errorCode: string | null;
  errorMessage: string | null;
  committedAt: string | null;
  createdAt: string;
}>;

export type ReconciliationStatusValue = "balanced" | "mismatch" | "unverifiable";

export type Statement = Readonly<{
  id: string;
  importId: string;
  sectionIndex: number;
  accountId: string;
  currency: string;
  periodStart: IsoDate | null;
  periodEnd: IsoDate | null;
  openingBalanceMinor: number | null;
  closingBalanceMinor: number | null;
  creditsMinor: number;
  debitsMinor: number;
  reconciliationStatus: ReconciliationStatusValue;
  reconciliationDifferenceMinor: number | null;
}>;

export type RequiredPayment = Readonly<{
  id: string;
  name: string;
  dueDay: number;
  matchPattern: string | null;
  expectedAmountMinor: number | null;
  currency: string | null;
  amountTolerancePct: number;
  accountId: string | null;
  isActive: boolean;
  sortOrder: number;
}>;

export type RequiredPaymentCheck = Readonly<{
  id: string;
  requiredPaymentId: string;
  // First day of the month, "YYYY-MM-01".
  periodMonth: IsoDate;
  status: "paid" | "unpaid";
  checkedAt: string;
}>;
