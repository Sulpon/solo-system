import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_CATEGORIES } from "../categorization/default-categories";
import type { ImportPreview } from "../import-preview";
import type {
  Budget,
  CategoryKind,
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
import {
  ACCOUNT_COLUMNS,
  BUDGET_COLUMNS,
  CATEGORY_COLUMNS,
  FINANCE_TABLES,
  IMPORT_COLUMNS,
  LINK_COLUMNS,
  REQUIRED_PAYMENT_CHECK_COLUMNS,
  REQUIRED_PAYMENT_COLUMNS,
  RULE_COLUMNS,
  STATEMENT_COLUMNS,
  TRANSACTION_COLUMNS,
  mapAccount,
  mapBudget,
  mapCategory,
  mapImport,
  mapLink,
  mapRequiredPayment,
  mapRequiredPaymentCheck,
  mapRule,
  mapStatement,
  mapTransaction,
  type AccountRow,
  type BudgetRow,
  type CategoryRow,
  type ImportRow,
  type LinkRow,
  type RequiredPaymentCheckRow,
  type RequiredPaymentRow,
  type RuleRow,
  type StatementRow,
  type TransactionRow,
} from "./rows";

// The finance data layer. Every read and write in Atlas Finance goes
// through here, taking the Supabase client as an argument so the same code
// runs in the browser (user session + RLS) and in route handlers.
//
// RLS is what keeps users apart; the explicit user_id filters below are a
// second line of defence, not the only one.

export class FinanceRepositoryError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "FinanceRepositoryError";
  }
}

type QueryResult<T> = { data: T | null; error: { message: string; code?: string } | null };

function unwrap<T>(result: QueryResult<T>, action: string): T {
  if (result.error) {
    // Database messages can name columns and constraints; the UI gets a
    // plain description of what failed, the console the detail.
    console.error(`[finance] ${action} failed`, result.error.code ?? "", result.error.message);
    throw new FinanceRepositoryError(`Could not ${action}.`, result.error);
  }
  return result.data as T;
}

const PAGE_SIZE = 1000;

// PostgREST caps a response at 1000 rows; read everything page by page.
async function selectAll<T>(fetchPage: (from: number, to: number) => PromiseLike<QueryResult<T[]>>, action: string): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const page = unwrap(await fetchPage(from, from + PAGE_SIZE - 1), action);
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

export type FinanceSnapshot = Readonly<{
  accounts: FinanceAccount[];
  categories: FinanceCategory[];
  rules: CategoryRule[];
  transactions: FinanceTransaction[];
  links: TransferLink[];
  budgets: Budget[];
  imports: StatementImport[];
  statements: Statement[];
  requiredPayments: RequiredPayment[];
  requiredPaymentChecks: RequiredPaymentCheck[];
}>;

export async function loadFinanceSnapshot(client: SupabaseClient, userId: string): Promise<FinanceSnapshot> {
  const [accounts, categories, rules, transactions, links, budgets, imports, statements, requiredPayments, requiredPaymentChecks] = await Promise.all([
    selectAll<AccountRow>((from, to) => client.from(FINANCE_TABLES.accounts).select(ACCOUNT_COLUMNS).eq("user_id", userId).order("name").range(from, to), "load accounts"),
    selectAll<CategoryRow>((from, to) => client.from(FINANCE_TABLES.categories).select(CATEGORY_COLUMNS).eq("user_id", userId).order("sort_order").order("name").range(from, to), "load categories"),
    selectAll<RuleRow>((from, to) => client.from(FINANCE_TABLES.rules).select(RULE_COLUMNS).eq("user_id", userId).order("created_at").range(from, to), "load rules"),
    selectAll<TransactionRow>(
      (from, to) => client.from(FINANCE_TABLES.transactions).select(TRANSACTION_COLUMNS).eq("user_id", userId).order("booked_on", { ascending: false }).order("id").range(from, to),
      "load transactions",
    ),
    selectAll<LinkRow>((from, to) => client.from(FINANCE_TABLES.links).select(LINK_COLUMNS).eq("user_id", userId).range(from, to), "load transfer links"),
    selectAll<BudgetRow>((from, to) => client.from(FINANCE_TABLES.budgets).select(BUDGET_COLUMNS).eq("user_id", userId).range(from, to), "load budgets"),
    selectAll<ImportRow>((from, to) => client.from(FINANCE_TABLES.imports).select(IMPORT_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).range(from, to), "load imports"),
    selectAll<StatementRow>((from, to) => client.from(FINANCE_TABLES.statements).select(STATEMENT_COLUMNS).eq("user_id", userId).range(from, to), "load statements"),
    selectAll<RequiredPaymentRow>(
      (from, to) => client.from(FINANCE_TABLES.requiredPayments).select(REQUIRED_PAYMENT_COLUMNS).eq("user_id", userId).order("sort_order").order("name").range(from, to),
      "load required payments",
    ),
    selectAll<RequiredPaymentCheckRow>(
      (from, to) => client.from(FINANCE_TABLES.requiredPaymentChecks).select(REQUIRED_PAYMENT_CHECK_COLUMNS).eq("user_id", userId).range(from, to),
      "load payment checks",
    ),
  ]);

  return {
    accounts: accounts.map(mapAccount),
    categories: categories.map(mapCategory),
    rules: rules.map(mapRule),
    transactions: transactions.map(mapTransaction),
    links: links.map(mapLink),
    budgets: budgets.map(mapBudget),
    imports: imports.map(mapImport),
    statements: statements.map(mapStatement),
    requiredPayments: requiredPayments.map(mapRequiredPayment),
    requiredPaymentChecks: requiredPaymentChecks.map(mapRequiredPaymentCheck),
  };
}

// Inserts any default category the user does not have yet, by slug. Never
// touches existing rows, so renames and disabled categories survive.
export async function ensureDefaultCategories(client: SupabaseClient, userId: string): Promise<boolean> {
  const existing = unwrap(await client.from(FINANCE_TABLES.categories).select("slug").eq("user_id", userId).not("slug", "is", null), "check categories") as Array<{ slug: string }>;
  const have = new Set(existing.map((row) => row.slug));
  const missing = DEFAULT_CATEGORIES.map((category, index) => ({ ...category, index })).filter((category) => !have.has(category.slug));

  if (missing.length === 0) return false;

  unwrap(
    await client.from(FINANCE_TABLES.categories).upsert(
      missing.map((category) => ({
        user_id: userId,
        slug: category.slug,
        name: category.name,
        kind: category.kind,
        color: category.color,
        is_system: true,
        sort_order: category.index * 10,
      })),
      { onConflict: "user_id,slug", ignoreDuplicates: true },
    ),
    "create default categories",
  );

  return true;
}

// --- Categories -------------------------------------------------------

export async function createCategory(client: SupabaseClient, userId: string, input: Readonly<{ name: string; kind: CategoryKind; color: string }>): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.categories).insert({ user_id: userId, name: input.name.trim(), kind: input.kind, color: input.color, sort_order: 1000 }), "create the category");
}

export async function updateCategory(client: SupabaseClient, userId: string, id: string, patch: Partial<Pick<FinanceCategory, "name" | "color" | "isEnabled" | "kind">>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.color !== undefined) row.color = patch.color;
  if (patch.isEnabled !== undefined) row.is_enabled = patch.isEnabled;
  if (patch.kind !== undefined) row.kind = patch.kind;
  unwrap(await client.from(FINANCE_TABLES.categories).update(row).eq("id", id).eq("user_id", userId), "update the category");
}

// Only user-made categories can be deleted; built-in ones are disabled.
// Transactions in a deleted category fall back to "Needs review".
export async function deleteCategory(client: SupabaseClient, userId: string, id: string): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.transactions).update({ review_status: "needs_review", categorization_method: "none" }).eq("user_id", userId).eq("category_id", id), "release the category's transactions");
  unwrap(await client.from(FINANCE_TABLES.categories).delete().eq("id", id).eq("user_id", userId).eq("is_system", false), "delete the category");
}

// --- Rules ------------------------------------------------------------

export type RuleInput = Readonly<Pick<CategoryRule, "field" | "matchType" | "pattern" | "accountId" | "direction" | "categoryId" | "priority"> & { source?: CategoryRule["source"] }>;

function ruleRow(input: RuleInput) {
  return {
    field: input.field,
    match_type: input.matchType,
    pattern: input.pattern.trim(),
    account_id: input.accountId,
    direction: input.direction,
    category_id: input.categoryId,
    priority: input.priority,
  };
}

export async function createRule(client: SupabaseClient, userId: string, input: RuleInput): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.rules).insert({ ...ruleRow(input), user_id: userId, source: input.source ?? "user" }), "create the rule");
}

export async function updateRule(client: SupabaseClient, userId: string, id: string, input: RuleInput & { isEnabled: boolean }): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.rules).update({ ...ruleRow(input), is_enabled: input.isEnabled }).eq("id", id).eq("user_id", userId), "update the rule");
}

export async function deleteRule(client: SupabaseClient, userId: string, id: string): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.rules).delete().eq("id", id).eq("user_id", userId), "delete the rule");
}

// --- Accounts -----------------------------------------------------------

export async function createManualAccount(client: SupabaseClient, userId: string, input: Readonly<{ name: string; currency: string }>): Promise<string> {
  const row = unwrap(
    await client
      .from(FINANCE_TABLES.accounts)
      .insert({ user_id: userId, name: input.name.trim(), currency: input.currency, bank: "manual", account_identifier: `manual:${crypto.randomUUID().slice(0, 8)}` })
      .select("id")
      .single(),
    "create the account",
  ) as { id: string };
  return row.id;
}

export async function updateAccount(client: SupabaseClient, userId: string, id: string, patch: Partial<Pick<FinanceAccount, "name" | "isArchived">>): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.name !== undefined) row.name = patch.name.trim();
  if (patch.isArchived !== undefined) row.is_archived = patch.isArchived;
  unwrap(await client.from(FINANCE_TABLES.accounts).update(row).eq("id", id).eq("user_id", userId), "update the account");
}

// --- Transactions -------------------------------------------------------

export type TransactionPatch = Partial<Pick<FinanceTransaction, "merchant" | "categoryId" | "reviewStatus" | "notes" | "bookedOn">> & {
  categorizationMethod?: FinanceTransaction["categorizationMethod"];
  // Only ever cleared ("keep both"), never set from the UI.
  clearPossibleDuplicate?: boolean;
};

function transactionPatchRow(patch: TransactionPatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (patch.merchant !== undefined) row.merchant = patch.merchant?.trim() || null;
  if (patch.categoryId !== undefined) {
    row.category_id = patch.categoryId;
    row.categorization_method = patch.categorizationMethod ?? (patch.categoryId ? "manual" : "none");
    row.categorization_rule_id = null;
  }
  if (patch.reviewStatus !== undefined) row.review_status = patch.reviewStatus;
  if (patch.notes !== undefined) row.notes = patch.notes?.trim() || null;
  if (patch.bookedOn !== undefined) row.booked_on = patch.bookedOn;
  if (patch.clearPossibleDuplicate) row.possible_duplicate_of = null;
  return row;
}

export async function updateTransactions(client: SupabaseClient, userId: string, ids: ReadonlyArray<string>, patch: TransactionPatch): Promise<void> {
  if (ids.length === 0) return;

  for (let index = 0; index < ids.length; index += 200) {
    unwrap(
      await client.from(FINANCE_TABLES.transactions).update(transactionPatchRow(patch)).eq("user_id", userId).in("id", ids.slice(index, index + 200)),
      "update the transactions",
    );
  }
}

// Re-categorisation by rule, one write per transaction (each may land in a
// different category). Only ever called on lines the user has not set by hand.
export async function applyCategorizations(
  client: SupabaseClient,
  userId: string,
  updates: ReadonlyArray<Readonly<{ id: string; categoryId: string; method: "rule_user" | "rule_builtin"; ruleId: string | null }>>,
): Promise<void> {
  for (const update of updates) {
    unwrap(
      await client
        .from(FINANCE_TABLES.transactions)
        .update({ category_id: update.categoryId, categorization_method: update.method, categorization_rule_id: update.ruleId, review_status: "confirmed" })
        .eq("user_id", userId)
        .eq("id", update.id),
      "apply the rule",
    );
  }
}

export async function deleteTransactions(client: SupabaseClient, userId: string, ids: ReadonlyArray<string>): Promise<void> {
  for (let index = 0; index < ids.length; index += 200) {
    unwrap(await client.from(FINANCE_TABLES.transactions).delete().eq("user_id", userId).in("id", ids.slice(index, index + 200)), "delete the transactions");
  }
}

export type ManualTransactionInput = Readonly<{
  accountId: string;
  bookedOn: string;
  description: string;
  merchant: string | null;
  amountMinor: number;
  currency: string;
  categoryId: string | null;
  fingerprint: string;
}>;

export async function createManualTransaction(client: SupabaseClient, userId: string, input: ManualTransactionInput): Promise<void> {
  // Manual entries are always distinct: the occurrence makes two identical
  // hand-entered coffees two rows instead of a conflict.
  const existing = unwrap(
    await client.from(FINANCE_TABLES.transactions).select("occurrence").eq("user_id", userId).eq("account_id", input.accountId).eq("fingerprint", input.fingerprint),
    "check for identical entries",
  ) as Array<{ occurrence: number }>;
  const occurrence = existing.reduce((max, row) => Math.max(max, row.occurrence), 0) + 1;

  unwrap(
    await client.from(FINANCE_TABLES.transactions).insert({
      user_id: userId,
      account_id: input.accountId,
      booked_on: input.bookedOn,
      description_original: input.description.trim(),
      merchant: input.merchant?.trim() || null,
      amount_minor: input.amountMinor,
      currency: input.currency,
      category_id: input.categoryId,
      categorization_method: input.categoryId ? "manual" : "none",
      review_status: input.categoryId ? "confirmed" : "needs_review",
      source: "manual",
      fingerprint: input.fingerprint,
      occurrence,
    }),
    "create the transaction",
  );
}

// --- Transfer links -------------------------------------------------------

export async function createTransferLink(client: SupabaseClient, userId: string, outgoingId: string, incomingId: string, kind: TransferLink["kind"]): Promise<void> {
  unwrap(
    await client.from(FINANCE_TABLES.links).insert({ user_id: userId, outgoing_transaction_id: outgoingId, incoming_transaction_id: incomingId, kind }),
    "link the transfer",
  );
}

export async function deleteTransferLink(client: SupabaseClient, userId: string, id: string): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.links).delete().eq("id", id).eq("user_id", userId), "unlink the transfer");
}

// --- Budgets ------------------------------------------------------------

export async function upsertBudget(client: SupabaseClient, userId: string, input: Readonly<{ categoryId: string; currency: string; monthlyAmountMinor: number }>): Promise<void> {
  unwrap(
    await client
      .from(FINANCE_TABLES.budgets)
      .upsert({ user_id: userId, category_id: input.categoryId, currency: input.currency, monthly_amount_minor: input.monthlyAmountMinor }, { onConflict: "user_id,category_id,currency" }),
    "save the budget",
  );
}

export async function deleteBudget(client: SupabaseClient, userId: string, id: string): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.budgets).delete().eq("id", id).eq("user_id", userId), "delete the budget");
}

// --- Required payments ---------------------------------------------------

export type RequiredPaymentInput = Readonly<Pick<RequiredPayment, "name" | "dueDay" | "matchPattern" | "expectedAmountMinor" | "currency" | "amountTolerancePct" | "accountId" | "isActive">>;

function requiredPaymentRow(input: RequiredPaymentInput) {
  return {
    name: input.name.trim(),
    due_day: input.dueDay,
    match_pattern: input.matchPattern?.trim() || null,
    expected_amount_minor: input.expectedAmountMinor,
    currency: input.currency,
    amount_tolerance_pct: input.amountTolerancePct,
    account_id: input.accountId,
    is_active: input.isActive,
  };
}

export async function createRequiredPayment(client: SupabaseClient, userId: string, input: RequiredPaymentInput): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.requiredPayments).insert({ ...requiredPaymentRow(input), user_id: userId }), "create the payment");
}

export async function updateRequiredPayment(client: SupabaseClient, userId: string, id: string, input: RequiredPaymentInput): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.requiredPayments).update(requiredPaymentRow(input)).eq("id", id).eq("user_id", userId), "update the payment");
}

export async function deleteRequiredPayment(client: SupabaseClient, userId: string, id: string): Promise<void> {
  unwrap(await client.from(FINANCE_TABLES.requiredPayments).delete().eq("id", id).eq("user_id", userId), "delete the payment");
}

// status null removes the manual decision, handing the month back to the
// automatic statement match.
export async function setRequiredPaymentCheck(client: SupabaseClient, userId: string, paymentId: string, periodMonth: string, status: "paid" | "unpaid" | null): Promise<void> {
  if (status === null) {
    unwrap(
      await client.from(FINANCE_TABLES.requiredPaymentChecks).delete().eq("user_id", userId).eq("required_payment_id", paymentId).eq("period_month", periodMonth),
      "clear the check",
    );
    return;
  }

  unwrap(
    await client
      .from(FINANCE_TABLES.requiredPaymentChecks)
      .upsert(
        { user_id: userId, required_payment_id: paymentId, period_month: periodMonth, status, checked_at: new Date().toISOString() },
        { onConflict: "required_payment_id,period_month" },
      ),
    "save the check",
  );
}

// --- Imports ------------------------------------------------------------

export async function loadImportPreview(client: SupabaseClient, userId: string, importId: string): Promise<ImportPreview | null> {
  const row = unwrap(
    await client.from(FINANCE_TABLES.imports).select("preview").eq("id", importId).eq("user_id", userId).maybeSingle(),
    "load the import preview",
  ) as { preview: ImportPreview | null } | null;
  return row?.preview ?? null;
}
