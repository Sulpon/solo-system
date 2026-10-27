import { categorizeTransaction, type CategorizationResult } from "./categorization/engine";
import { assignOccurrences, classifyDuplicates, transactionFingerprint, type DuplicateVerdict, type ExistingTransactionForDedupe } from "./dedupe";
import type { ParsedStatement, ParsedTransaction, StatementAccountInfo, StatementBalances, StatementIssue } from "./parsers/types";
import { reconcileSection, type ReconciliationResult } from "./reconciliation";
import type { CategoryRule, FinanceAccount, FinanceCategory, ReviewStatus, TransactionSource } from "./types";

// What the user reviews before anything is saved. Built on the server at
// upload time and stored on the import row until committed or cancelled.

export const IMPORT_PREVIEW_VERSION = 1;

export type PreviewTransaction = ParsedTransaction &
  Readonly<{
    // "<section>:<line>", stable for the life of the preview.
    key: string;
    fingerprint: string;
    occurrence: number;
    suggestion: CategorizationResult;
    duplicate: DuplicateVerdict;
    // Messages from line-level checks (e.g. a running balance that jumps).
    issues: ReadonlyArray<string>;
  }>;

export type PreviewSection = Readonly<{
  index: number;
  account: StatementAccountInfo;
  balances: StatementBalances;
  reconciliation: ReconciliationResult;
  // The existing account this section was matched to, if any.
  matchedAccountId: string | null;
  transactions: ReadonlyArray<PreviewTransaction>;
}>;

export type ImportPreview = Readonly<{
  version: typeof IMPORT_PREVIEW_VERSION;
  parserId: string;
  bankName: string;
  fileType: "pdf" | "csv";
  sections: ReadonlyArray<PreviewSection>;
  issues: ReadonlyArray<StatementIssue>;
}>;

export type PreviewContext = Readonly<{
  accounts: ReadonlyArray<FinanceAccount>;
  categories: ReadonlyArray<FinanceCategory>;
  rules: ReadonlyArray<CategoryRule>;
  // Stored transactions of the matched accounts, by account id.
  existingByAccount: ReadonlyMap<string, ReadonlyArray<ExistingTransactionForDedupe>>;
}>;

// A statement section belongs to an existing account when bank, masked
// identifier, currency and product all agree. CSV sections carry no
// identifier, so they are never matched automatically: the user picks.
export function matchAccount(account: StatementAccountInfo, parserId: string, accounts: ReadonlyArray<FinanceAccount>): FinanceAccount | null {
  if (!account.accountIdentifier) return null;

  return (
    accounts.find(
      (candidate) =>
        candidate.bank === parserId &&
        candidate.accountIdentifier === account.accountIdentifier &&
        candidate.currency === account.currency &&
        candidate.product === account.product,
    ) ?? null
  );
}

export function fingerprintsFor(transactions: ReadonlyArray<ParsedTransaction>): Array<Readonly<{ fingerprint: string; occurrence: number }>> {
  const fingerprints = transactions.map((transaction) =>
    transactionFingerprint({
      bookedOn: transaction.bookedOn,
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      description: transaction.description,
      reference: transaction.reference,
    }),
  );
  const occurrences = assignOccurrences(fingerprints);
  return fingerprints.map((fingerprint, index) => ({ fingerprint, occurrence: occurrences[index] }));
}

export function buildImportPreview(statement: ParsedStatement, fileType: "pdf" | "csv", context: PreviewContext): ImportPreview {
  const sections = statement.sections.map((section) => {
    const matched = matchAccount(section.account, statement.parserId, context.accounts);
    const identities = fingerprintsFor(section.transactions);
    const verdicts = classifyDuplicates(
      section.transactions.map((transaction, index) => ({ ...transaction, ...identities[index] })),
      matched ? (context.existingByAccount.get(matched.id) ?? []) : [],
    );
    const lineIssues = statement.issues.filter((issue) => issue.sectionIndex === section.index && issue.transactionIndex !== null);

    return {
      index: section.index,
      account: section.account,
      balances: section.balances,
      reconciliation: reconcileSection(section),
      matchedAccountId: matched?.id ?? null,
      transactions: section.transactions.map((transaction, index) => ({
        ...transaction,
        key: `${section.index}:${index}`,
        fingerprint: identities[index].fingerprint,
        occurrence: identities[index].occurrence,
        suggestion: categorizeTransaction(
          { merchant: transaction.merchant, description: transaction.description, amountMinor: transaction.amountMinor, accountId: matched?.id ?? null, bank: statement.parserId },
          { rules: context.rules, categories: context.categories },
        ),
        duplicate: verdicts[index],
        issues: lineIssues.filter((issue) => issue.transactionIndex === index).map((issue) => issue.message),
      })),
    };
  });

  return {
    version: IMPORT_PREVIEW_VERSION,
    parserId: statement.parserId,
    bankName: statement.bankName,
    fileType,
    sections,
    issues: statement.issues.filter((issue) => issue.transactionIndex === null),
  };
}

// ---------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------

export type CommitSectionDecision = Readonly<{
  index: number;
  // Existing account to import into; null creates (or reuses) the
  // statement's own account.
  accountId: string | null;
  accountName: string;
}>;

export type CommitTransactionDecision = Readonly<{
  key: string;
  include: boolean;
  categoryId: string | null;
}>;

export type CommitDecisions = Readonly<{
  sections: ReadonlyArray<CommitSectionDecision>;
  transactions: ReadonlyArray<CommitTransactionDecision>;
}>;

export type TransactionInsertRow = Readonly<{
  user_id: string;
  account_id: string;
  statement_id: string | null;
  import_id: string;
  booked_on: string;
  posted_on: string | null;
  description_original: string;
  merchant: string | null;
  amount_minor: number;
  currency: string;
  original_amount_minor: number | null;
  original_currency: string | null;
  fee_minor: number | null;
  bank_reference: string | null;
  category_id: string | null;
  categorization_method: string;
  categorization_rule_id: string | null;
  review_status: ReviewStatus;
  source: TransactionSource;
  fingerprint: string;
  occurrence: number;
  possible_duplicate_of: string | null;
}>;

// Turns a reviewed preview into rows. Amounts, dates and descriptions come
// ONLY from the stored preview; the client's decisions can include,
// exclude and recategorise lines but never alter what the bank printed.
// Lines already imported (exact duplicates) are always skipped.
export function buildTransactionRows(
  preview: ImportPreview,
  decisions: CommitDecisions,
  input: Readonly<{
    userId: string;
    importId: string;
    accountIdBySection: ReadonlyMap<number, string>;
    statementIdBySection: ReadonlyMap<number, string>;
    validCategoryIds: ReadonlySet<string>;
  }>,
): TransactionInsertRow[] {
  const decisionByKey = new Map(decisions.transactions.map((decision) => [decision.key, decision]));
  const source: TransactionSource = preview.fileType === "csv" ? "csv" : "pdf";
  const rows: TransactionInsertRow[] = [];

  for (const section of preview.sections) {
    const accountId = input.accountIdBySection.get(section.index);
    if (!accountId) continue;

    for (const transaction of section.transactions) {
      const decision = decisionByKey.get(transaction.key);
      if (transaction.duplicate.status === "exact" || decision?.include === false) continue;

      const suggested = transaction.suggestion.categoryId;
      const chosen = decision ? decision.categoryId : suggested;
      const categoryId = chosen && input.validCategoryIds.has(chosen) ? chosen : null;
      const changedByUser = decision !== undefined && categoryId !== suggested;
      const isPossibleDuplicate = transaction.duplicate.status === "possible";

      rows.push({
        user_id: input.userId,
        account_id: accountId,
        statement_id: input.statementIdBySection.get(section.index) ?? null,
        import_id: input.importId,
        booked_on: transaction.bookedOn,
        posted_on: transaction.postedOn,
        description_original: transaction.description,
        merchant: transaction.merchant,
        amount_minor: transaction.amountMinor,
        currency: transaction.currency,
        original_amount_minor: transaction.originalAmountMinor,
        original_currency: transaction.originalCurrency,
        fee_minor: transaction.feeMinor,
        bank_reference: transaction.reference,
        category_id: categoryId,
        categorization_method: changedByUser ? (categoryId ? "manual" : "none") : categoryId ? transaction.suggestion.method : "none",
        categorization_rule_id: changedByUser ? null : transaction.suggestion.ruleId,
        review_status: categoryId && !isPossibleDuplicate ? "confirmed" : "needs_review",
        source,
        fingerprint: transaction.fingerprint,
        occurrence: transaction.occurrence,
        possible_duplicate_of: isPossibleDuplicate ? transaction.duplicate.matchId : null,
      });
    }
  }

  return rows;
}

export function isImportPreview(value: unknown): value is ImportPreview {
  return Boolean(value && typeof value === "object" && (value as { version?: unknown }).version === IMPORT_PREVIEW_VERSION && Array.isArray((value as { sections?: unknown }).sections));
}
