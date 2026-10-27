import type {
  Budget,
  CategoryRule,
  FinanceAccount,
  FinanceCategory,
  FinanceTransaction,
  RequiredPayment,
  RequiredPaymentCheck,
  Statement,
  StatementImport,
  TransferLink,
} from "../types";

// Database rows (snake_case, as stored) and their mapping to domain types.
// The only file that knows column names besides the repository itself, so
// a future storage change touches these two files and nothing in the UI.

export const FINANCE_TABLES = {
  accounts: "finance_accounts",
  categories: "finance_categories",
  imports: "finance_statement_imports",
  statements: "finance_statements",
  rules: "finance_category_rules",
  transactions: "finance_transactions",
  links: "finance_transfer_links",
  budgets: "finance_budgets",
  requiredPayments: "finance_required_payments",
  requiredPaymentChecks: "finance_required_payment_checks",
} as const;

export const STATEMENTS_BUCKET = "finance-statements";

export type AccountRow = {
  id: string;
  name: string;
  bank: string;
  account_identifier: string | null;
  currency: string;
  product: string;
  is_archived: boolean;
};

export type CategoryRow = {
  id: string;
  slug: string | null;
  name: string;
  kind: FinanceCategory["kind"];
  color: string;
  is_enabled: boolean;
  is_system: boolean;
  sort_order: number;
};

export type RuleRow = {
  id: string;
  field: CategoryRule["field"];
  match_type: CategoryRule["matchType"];
  pattern: string;
  account_id: string | null;
  direction: CategoryRule["direction"];
  category_id: string;
  priority: number;
  is_enabled: boolean;
  source: CategoryRule["source"];
  created_at: string;
};

export type TransactionRow = {
  id: string;
  account_id: string;
  statement_id: string | null;
  import_id: string | null;
  booked_on: string;
  posted_on: string | null;
  description_original: string;
  merchant: string | null;
  amount_minor: number | string;
  currency: string;
  original_amount_minor: number | string | null;
  original_currency: string | null;
  fee_minor: number | string | null;
  bank_reference: string | null;
  category_id: string | null;
  categorization_method: FinanceTransaction["categorizationMethod"];
  categorization_rule_id: string | null;
  review_status: FinanceTransaction["reviewStatus"];
  source: FinanceTransaction["source"];
  fingerprint: string;
  occurrence: number;
  possible_duplicate_of: string | null;
  notes: string | null;
  created_at: string;
};

export type LinkRow = { id: string; outgoing_transaction_id: string; incoming_transaction_id: string; kind: TransferLink["kind"]; created_at: string };

export type BudgetRow = { id: string; category_id: string; currency: string; monthly_amount_minor: number | string };

export type ImportRow = {
  id: string;
  file_name: string;
  file_size: number;
  file_type: StatementImport["fileType"];
  bank: string | null;
  status: StatementImport["status"];
  error_code: string | null;
  error_message: string | null;
  committed_at: string | null;
  created_at: string;
};

export type StatementRow = {
  id: string;
  import_id: string;
  section_index: number;
  account_id: string;
  currency: string;
  period_start: string | null;
  period_end: string | null;
  opening_balance_minor: number | string | null;
  closing_balance_minor: number | string | null;
  credits_minor: number | string;
  debits_minor: number | string;
  reconciliation_status: Statement["reconciliationStatus"];
  reconciliation_difference_minor: number | string | null;
};

export type RequiredPaymentRow = {
  id: string;
  name: string;
  due_day: number;
  match_pattern: string | null;
  expected_amount_minor: number | string | null;
  currency: string | null;
  amount_tolerance_pct: number | string;
  account_id: string | null;
  is_active: boolean;
  sort_order: number;
};

export type RequiredPaymentCheckRow = { id: string; required_payment_id: string; period_month: string; status: "paid" | "unpaid"; checked_at: string };

// bigint columns arrive as numbers from PostgREST, but may arrive as
// strings for values beyond 2^53 - never the case for real money, and
// rejected loudly rather than silently truncated.
function toMinor(value: number | string): number {
  const number = typeof value === "string" ? Number(value) : value;
  if (!Number.isSafeInteger(number)) throw new Error("Amount out of range");
  return number;
}

function toMinorOrNull(value: number | string | null): number | null {
  return value === null ? null : toMinor(value);
}

export const ACCOUNT_COLUMNS = "id,name,bank,account_identifier,currency,product,is_archived";
export const CATEGORY_COLUMNS = "id,slug,name,kind,color,is_enabled,is_system,sort_order";
export const RULE_COLUMNS = "id,field,match_type,pattern,account_id,direction,category_id,priority,is_enabled,source,created_at";
export const TRANSACTION_COLUMNS =
  "id,account_id,statement_id,import_id,booked_on,posted_on,description_original,merchant,amount_minor,currency,original_amount_minor,original_currency,fee_minor,bank_reference,category_id,categorization_method,categorization_rule_id,review_status,source,fingerprint,occurrence,possible_duplicate_of,notes,created_at";
export const LINK_COLUMNS = "id,outgoing_transaction_id,incoming_transaction_id,kind,created_at";
export const BUDGET_COLUMNS = "id,category_id,currency,monthly_amount_minor";
export const IMPORT_COLUMNS = "id,file_name,file_size,file_type,bank,status,error_code,error_message,committed_at,created_at";
export const STATEMENT_COLUMNS =
  "id,import_id,section_index,account_id,currency,period_start,period_end,opening_balance_minor,closing_balance_minor,credits_minor,debits_minor,reconciliation_status,reconciliation_difference_minor";
export const REQUIRED_PAYMENT_COLUMNS = "id,name,due_day,match_pattern,expected_amount_minor,currency,amount_tolerance_pct,account_id,is_active,sort_order";
export const REQUIRED_PAYMENT_CHECK_COLUMNS = "id,required_payment_id,period_month,status,checked_at";

export const mapAccount = (row: AccountRow): FinanceAccount => ({
  id: row.id,
  name: row.name,
  bank: row.bank,
  accountIdentifier: row.account_identifier,
  currency: row.currency,
  product: row.product,
  isArchived: row.is_archived,
});

export const mapCategory = (row: CategoryRow): FinanceCategory => ({
  id: row.id,
  slug: row.slug,
  name: row.name,
  kind: row.kind,
  color: row.color,
  isEnabled: row.is_enabled,
  isSystem: row.is_system,
  sortOrder: row.sort_order,
});

export const mapRule = (row: RuleRow): CategoryRule => ({
  id: row.id,
  field: row.field,
  matchType: row.match_type,
  pattern: row.pattern,
  accountId: row.account_id,
  direction: row.direction,
  categoryId: row.category_id,
  priority: row.priority,
  isEnabled: row.is_enabled,
  source: row.source,
  createdAt: row.created_at,
});

export const mapTransaction = (row: TransactionRow): FinanceTransaction => ({
  id: row.id,
  accountId: row.account_id,
  statementId: row.statement_id,
  importId: row.import_id,
  bookedOn: row.booked_on,
  postedOn: row.posted_on,
  descriptionOriginal: row.description_original,
  merchant: row.merchant,
  amountMinor: toMinor(row.amount_minor),
  currency: row.currency,
  originalAmountMinor: toMinorOrNull(row.original_amount_minor),
  originalCurrency: row.original_currency,
  feeMinor: toMinorOrNull(row.fee_minor),
  bankReference: row.bank_reference,
  categoryId: row.category_id,
  categorizationMethod: row.categorization_method,
  categorizationRuleId: row.categorization_rule_id,
  reviewStatus: row.review_status,
  source: row.source,
  fingerprint: row.fingerprint,
  occurrence: row.occurrence,
  possibleDuplicateOf: row.possible_duplicate_of,
  notes: row.notes,
  createdAt: row.created_at,
});

export const mapLink = (row: LinkRow): TransferLink => ({
  id: row.id,
  outgoingTransactionId: row.outgoing_transaction_id,
  incomingTransactionId: row.incoming_transaction_id,
  kind: row.kind,
  createdAt: row.created_at,
});

export const mapBudget = (row: BudgetRow): Budget => ({
  id: row.id,
  categoryId: row.category_id,
  currency: row.currency,
  monthlyAmountMinor: toMinor(row.monthly_amount_minor),
});

export const mapImport = (row: ImportRow): StatementImport => ({
  id: row.id,
  fileName: row.file_name,
  fileSize: row.file_size,
  fileType: row.file_type,
  bank: row.bank,
  status: row.status,
  errorCode: row.error_code,
  errorMessage: row.error_message,
  committedAt: row.committed_at,
  createdAt: row.created_at,
});

export const mapStatement = (row: StatementRow): Statement => ({
  id: row.id,
  importId: row.import_id,
  sectionIndex: row.section_index,
  accountId: row.account_id,
  currency: row.currency,
  periodStart: row.period_start,
  periodEnd: row.period_end,
  openingBalanceMinor: toMinorOrNull(row.opening_balance_minor),
  closingBalanceMinor: toMinorOrNull(row.closing_balance_minor),
  creditsMinor: toMinor(row.credits_minor),
  debitsMinor: toMinor(row.debits_minor),
  reconciliationStatus: row.reconciliation_status,
  reconciliationDifferenceMinor: toMinorOrNull(row.reconciliation_difference_minor),
});

export const mapRequiredPayment = (row: RequiredPaymentRow): RequiredPayment => ({
  id: row.id,
  name: row.name,
  dueDay: row.due_day,
  matchPattern: row.match_pattern,
  expectedAmountMinor: toMinorOrNull(row.expected_amount_minor),
  currency: row.currency,
  amountTolerancePct: Number(row.amount_tolerance_pct),
  accountId: row.account_id,
  isActive: row.is_active,
  sortOrder: row.sort_order,
});

export const mapRequiredPaymentCheck = (row: RequiredPaymentCheckRow): RequiredPaymentCheck => ({
  id: row.id,
  requiredPaymentId: row.required_payment_id,
  periodMonth: row.period_month,
  status: row.status,
  checkedAt: row.checked_at,
});
