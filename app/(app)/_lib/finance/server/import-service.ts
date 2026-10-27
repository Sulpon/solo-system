import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, type NumericDateOrder } from "../dates";
import type { ExistingTransactionForDedupe } from "../dedupe";
import { buildImportPreview, buildTransactionRows, isImportPreview, matchAccount, type CommitDecisions, type ImportPreview } from "../import-preview";
import { isCurrencyCode } from "../money";
import { parseCsvStatement } from "../parsers/csv";
import { parseStatementDocument } from "../parsers/registry";
import { StatementParseError, type ParsedStatement } from "../parsers/types";
import { PdfExtractionError, extractPdfText, type PdfExtractionFailure } from "../pdf/extract-text";
import { ensureDefaultCategories } from "../repository/finance-repository";
import {
  ACCOUNT_COLUMNS,
  CATEGORY_COLUMNS,
  FINANCE_TABLES,
  IMPORT_COLUMNS,
  RULE_COLUMNS,
  STATEMENTS_BUCKET,
  mapAccount,
  mapCategory,
  mapImport,
  mapRule,
  type AccountRow,
  type CategoryRow,
  type ImportRow,
  type RuleRow,
} from "../repository/rows";
import type { StatementImport } from "../types";
import { sanitizeFileName, sha256Hex, validateStatementUpload } from "./file-validation";

// The server half of statement import: validate, parse, preview, commit,
// cancel. Runs inside route handlers with the signed-in user's own
// Supabase session, so RLS applies to every query here exactly as it does
// in the browser - no service-role key exists anywhere in Atlas.
//
// Nothing in this file logs statement contents, descriptions or account
// numbers. Errors are logged by code only.

export type ServiceFailure = Readonly<{ ok: false; status: number; code: string; message: string; importRecord?: StatementImport }>;
export type ServiceResult<T> = Readonly<{ ok: true; value: T }> | ServiceFailure;

const fail = (status: number, code: string, message: string, importRecord?: StatementImport): ServiceFailure => ({ ok: false, status, code, message, importRecord });

const EXTRACTION_MESSAGES: Readonly<Record<PdfExtractionFailure, string>> = {
  no_text:
    "This PDF contains no readable text - it looks like a scan or a photo. Atlas cannot read scanned statements yet (OCR is not supported). Download the original PDF from your bank's app or website, or import a CSV instead.",
  encrypted: "This PDF is password-protected. Save an unprotected copy from your bank and upload that.",
  malformed: "This file could not be read as a PDF. It may be damaged or incomplete.",
  too_many_pages: "This PDF has more than 80 pages. Export a shorter period and import it in parts.",
  timeout: "Reading this PDF took too long. Export a shorter period and try again.",
};

export type CsvUploadOptions = Readonly<{ currency: string; dateOrder: NumericDateOrder; accountName: string }>;

export type CreatedImport = Readonly<{ importRecord: StatementImport; preview: ImportPreview | null; alreadyExisted: boolean }>;

async function parseUpload(kind: "pdf" | "csv", bytes: Uint8Array, fileName: string, csv: CsvUploadOptions): Promise<ParsedStatement> {
  if (kind === "pdf") {
    return parseStatementDocument(await extractPdfText(bytes));
  }

  const text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  return parseCsvStatement(text, {
    defaultCurrency: csv.currency,
    dateOrder: csv.dateOrder,
    accountName: csv.accountName.trim() || fileName.replace(/\.csv$/i, ""),
  });
}

async function loadPreviewContext(client: SupabaseClient, userId: string, statement: ParsedStatement) {
  await ensureDefaultCategories(client, userId);

  const [accountsResult, categoriesResult, rulesResult] = await Promise.all([
    client.from(FINANCE_TABLES.accounts).select(ACCOUNT_COLUMNS).eq("user_id", userId),
    client.from(FINANCE_TABLES.categories).select(CATEGORY_COLUMNS).eq("user_id", userId),
    client.from(FINANCE_TABLES.rules).select(RULE_COLUMNS).eq("user_id", userId),
  ]);

  if (accountsResult.error || categoriesResult.error || rulesResult.error) {
    throw new Error("context_load_failed");
  }

  const accounts = (accountsResult.data as AccountRow[]).map(mapAccount);
  const existingByAccount = new Map<string, ExistingTransactionForDedupe[]>();

  for (const section of statement.sections) {
    const account = matchAccount(section.account, statement.parserId, accounts);
    if (!account) continue;

    let query = client
      .from(FINANCE_TABLES.transactions)
      .select("id,booked_on,amount_minor,currency,fingerprint,occurrence,source")
      .eq("user_id", userId)
      .eq("account_id", account.id);

    // Only the statement's own window (plus the manual-entry slack) can
    // hold duplicates of its lines.
    if (section.balances.periodStart) query = query.gte("booked_on", addDays(section.balances.periodStart, -3));
    if (section.balances.periodEnd) query = query.lte("booked_on", addDays(section.balances.periodEnd, 3));

    const { data, error } = await query.limit(20000);
    if (error) throw new Error("context_load_failed");

    const existing = (data as Array<{ id: string; booked_on: string; amount_minor: number; currency: string; fingerprint: string; occurrence: number; source: "pdf" | "csv" | "manual" }>).map(
      (row) => ({ id: row.id, bookedOn: row.booked_on, amountMinor: Number(row.amount_minor), currency: row.currency, fingerprint: row.fingerprint, occurrence: row.occurrence, source: row.source }),
    );
    existingByAccount.set(account.id, [...(existingByAccount.get(account.id) ?? []), ...existing]);
  }

  return {
    accounts,
    categories: (categoriesResult.data as CategoryRow[]).map(mapCategory),
    rules: (rulesResult.data as RuleRow[]).map(mapRule),
    existingByAccount,
  };
}

async function insertFailedImport(
  client: SupabaseClient,
  userId: string,
  base: Readonly<{ file_name: string; file_size: number; file_type: "pdf" | "csv"; file_sha256: string }>,
  code: string,
  message: string,
): Promise<StatementImport | undefined> {
  const { data } = await client
    .from(FINANCE_TABLES.imports)
    .insert({ ...base, user_id: userId, status: "failed", error_code: code, error_message: message })
    .select(IMPORT_COLUMNS)
    .single();
  return data ? mapImport(data as ImportRow) : undefined;
}

export async function createStatementImport(
  client: SupabaseClient,
  userId: string,
  file: Readonly<{ name: string; type: string; bytes: Uint8Array }>,
  csv: CsvUploadOptions,
): Promise<ServiceResult<CreatedImport>> {
  const validation = validateStatementUpload(file.name, file.type, file.bytes);
  if (!validation.ok) return fail(400, "invalid_file", validation.message);

  if (validation.kind === "csv" && csv.currency && !isCurrencyCode(csv.currency)) {
    return fail(400, "invalid_currency", "Choose a valid three-letter currency for the CSV.");
  }

  const fileSha256 = await sha256Hex(file.bytes);
  const fileName = sanitizeFileName(file.name);

  // Same bytes again: resume the pending review, refuse a re-commit, and
  // retry a previous failure (the parser may have improved since).
  const { data: existingRow, error: existingError } = await client
    .from(FINANCE_TABLES.imports)
    .select(`${IMPORT_COLUMNS},preview`)
    .eq("user_id", userId)
    .eq("file_sha256", fileSha256)
    .maybeSingle();

  if (existingError) return fail(500, "storage_error", "Atlas could not check your previous imports. Try again.");

  if (existingRow) {
    const record = mapImport(existingRow as ImportRow);

    if (record.status === "committed") {
      return fail(409, "already_imported", `This exact file was already imported on ${record.committedAt?.slice(0, 10) ?? "an earlier date"}. Nothing was added twice.`, record);
    }

    if (record.status === "needs_review") {
      const preview = (existingRow as { preview: unknown }).preview;
      return { ok: true, value: { importRecord: record, preview: isImportPreview(preview) ? preview : null, alreadyExisted: true } };
    }

    await client.from(FINANCE_TABLES.imports).delete().eq("id", record.id).eq("user_id", userId);
  }

  const base = { file_name: fileName, file_size: file.bytes.length, file_type: validation.kind, file_sha256: fileSha256 };

  let statement: ParsedStatement;

  try {
    statement = await parseUpload(validation.kind, file.bytes, fileName, csv);
  } catch (error) {
    if (error instanceof PdfExtractionError) {
      const record = await insertFailedImport(client, userId, base, error.code, EXTRACTION_MESSAGES[error.code]);
      return fail(422, error.code, EXTRACTION_MESSAGES[error.code], record);
    }

    if (error instanceof StatementParseError) {
      const record = await insertFailedImport(client, userId, base, error.code, error.message);
      return fail(422, error.code, error.message, record);
    }

    console.error("[finance] import parse failed", error instanceof Error ? error.name : "unknown");
    const message = "Atlas could not read this file. Nothing was imported.";
    const record = await insertFailedImport(client, userId, base, "parse_failed", message);
    return fail(422, "parse_failed", message, record);
  }

  let preview: ImportPreview;

  try {
    preview = buildImportPreview(statement, validation.kind, await loadPreviewContext(client, userId, statement));
  } catch {
    return fail(500, "storage_error", "Atlas could not load your accounts and rules. Check that the finance migration has been applied, then try again.");
  }

  const { data: created, error: insertError } = await client
    .from(FINANCE_TABLES.imports)
    .insert({ ...base, user_id: userId, status: "needs_review", bank: statement.parserId, preview })
    .select(IMPORT_COLUMNS)
    .single();

  if (insertError || !created) {
    console.error("[finance] import insert failed", insertError?.code ?? "");
    return fail(500, "storage_error", "Atlas could not save this import. Check that the finance migration has been applied.");
  }

  const record = mapImport(created as ImportRow);
  const storagePath = `${userId}/${record.id}.${validation.kind}`;
  const upload = await client.storage
    .from(STATEMENTS_BUCKET)
    .upload(storagePath, file.bytes, { contentType: validation.kind === "pdf" ? "application/pdf" : "text/csv", upsert: true });

  if (upload.error) {
    // Without the private copy the import is not what the user asked for;
    // undo it rather than keep a half-stored record.
    await client.from(FINANCE_TABLES.imports).delete().eq("id", record.id).eq("user_id", userId);
    console.error("[finance] statement upload failed");
    return fail(500, "storage_error", "Atlas could not store the statement file privately. Check that the 'finance-statements' storage bucket exists (it is created by the finance migration).");
  }

  await client.from(FINANCE_TABLES.imports).update({ storage_path: storagePath }).eq("id", record.id).eq("user_id", userId);

  return { ok: true, value: { importRecord: record, preview, alreadyExisted: false } };
}

// ---------------------------------------------------------------------
// Commit
// ---------------------------------------------------------------------

export function parseCommitDecisions(body: unknown): CommitDecisions | null {
  if (!body || typeof body !== "object") return null;
  const record = body as { sections?: unknown; transactions?: unknown };
  if (!Array.isArray(record.sections) || !Array.isArray(record.transactions)) return null;

  const sections = record.sections.map((section) => {
    const value = section as { index?: unknown; accountId?: unknown; accountName?: unknown };
    if (typeof value.index !== "number" || (value.accountId !== null && typeof value.accountId !== "string") || typeof value.accountName !== "string") return null;
    return { index: value.index, accountId: value.accountId as string | null, accountName: value.accountName.slice(0, 120) };
  });

  const transactions = record.transactions.map((transaction) => {
    const value = transaction as { key?: unknown; include?: unknown; categoryId?: unknown };
    if (typeof value.key !== "string" || typeof value.include !== "boolean" || (value.categoryId !== null && typeof value.categoryId !== "string")) return null;
    return { key: value.key, include: value.include, categoryId: value.categoryId as string | null };
  });

  if (sections.some((section) => section === null) || transactions.some((transaction) => transaction === null)) return null;

  return { sections: sections as CommitDecisions["sections"], transactions: transactions as CommitDecisions["transactions"] };
}

async function findOrCreateAccount(
  client: SupabaseClient,
  userId: string,
  input: Readonly<{ name: string; bank: string; identifier: string | null; currency: string; product: string }>,
): Promise<string | null> {
  const find = async () => {
    let query = client.from(FINANCE_TABLES.accounts).select("id").eq("user_id", userId).eq("bank", input.bank).eq("currency", input.currency).eq("product", input.product);
    query = input.identifier === null ? query.is("account_identifier", null) : query.eq("account_identifier", input.identifier);
    const { data } = await query.maybeSingle();
    return (data as { id: string } | null)?.id ?? null;
  };

  const existing = await find();
  if (existing) return existing;

  const { data, error } = await client
    .from(FINANCE_TABLES.accounts)
    .insert({ user_id: userId, name: input.name, bank: input.bank, account_identifier: input.identifier, currency: input.currency, product: input.product })
    .select("id")
    .single();

  // A concurrent commit may have created it a moment ago.
  if (error) return find();
  return (data as { id: string }).id;
}

export type CommitSummary = Readonly<{ inserted: number; skipped: number; importRecord: StatementImport }>;

export async function commitStatementImport(client: SupabaseClient, userId: string, importId: string, decisions: CommitDecisions): Promise<ServiceResult<CommitSummary>> {
  const { data: row, error } = await client.from(FINANCE_TABLES.imports).select(`${IMPORT_COLUMNS},preview`).eq("id", importId).eq("user_id", userId).maybeSingle();

  if (error) return fail(500, "storage_error", "Atlas could not load this import.");
  if (!row) return fail(404, "not_found", "This import no longer exists.");

  const record = mapImport(row as ImportRow);

  // Idempotent: committing twice is a no-op, not a double import.
  if (record.status === "committed") return { ok: true, value: { inserted: 0, skipped: 0, importRecord: record } };
  if (record.status === "failed") return fail(409, "import_failed", "A failed import cannot be committed.");

  const preview = (row as { preview: unknown }).preview;
  if (!isImportPreview(preview)) return fail(409, "preview_missing", "This import has no preview to commit. Upload the file again.");

  const [accountsResult, categoriesResult] = await Promise.all([
    client.from(FINANCE_TABLES.accounts).select(ACCOUNT_COLUMNS).eq("user_id", userId),
    client.from(FINANCE_TABLES.categories).select("id").eq("user_id", userId),
  ]);

  if (accountsResult.error || categoriesResult.error) return fail(500, "storage_error", "Atlas could not load your accounts.");

  const accounts = (accountsResult.data as AccountRow[]).map(mapAccount);
  const validCategoryIds = new Set((categoriesResult.data as Array<{ id: string }>).map((category) => category.id));
  const decisionBySection = new Map(decisions.sections.map((section) => [section.index, section]));
  const accountIdBySection = new Map<number, string>();
  const statementIdBySection = new Map<number, string>();

  for (const section of preview.sections) {
    const decision = decisionBySection.get(section.index);
    const chosen = decision?.accountId ? accounts.find((account) => account.id === decision.accountId) : undefined;

    if (decision?.accountId && (!chosen || chosen.currency !== section.account.currency)) {
      return fail(400, "invalid_account", "One of the chosen accounts does not exist or uses a different currency.");
    }

    const name = decision?.accountName.trim() || section.account.suggestedName;
    const accountId =
      chosen?.id ??
      (await findOrCreateAccount(client, userId, {
        name,
        bank: preview.parserId,
        // Sections without an account number (CSV files) are identified by
        // the account name the user gives, so the next import with the same
        // name lands in the same account.
        identifier: section.account.accountIdentifier ?? `name:${name.toLowerCase().slice(0, 34)}`,
        currency: section.account.currency,
        product: section.account.product,
      }));

    if (!accountId) return fail(500, "storage_error", "Atlas could not create the account for this statement.");
    accountIdBySection.set(section.index, accountId);

    const { data: statementRow, error: statementError } = await client
      .from(FINANCE_TABLES.statements)
      .upsert(
        {
          user_id: userId,
          import_id: importId,
          section_index: section.index,
          account_id: accountId,
          currency: section.account.currency,
          period_start: section.balances.periodStart,
          period_end: section.balances.periodEnd,
          opening_balance_minor: section.balances.openingBalanceMinor,
          closing_balance_minor: section.balances.closingBalanceMinor,
          credits_minor: section.reconciliation.creditsMinor,
          debits_minor: section.reconciliation.debitsMinor,
          reconciliation_status: section.reconciliation.status,
          reconciliation_difference_minor: section.reconciliation.differenceMinor,
        },
        { onConflict: "import_id,section_index" },
      )
      .select("id")
      .single();

    if (statementError || !statementRow) return fail(500, "storage_error", "Atlas could not save the statement record.");
    statementIdBySection.set(section.index, (statementRow as { id: string }).id);
  }

  const rows = buildTransactionRows(preview, decisions, { userId, importId, accountIdBySection, statementIdBySection, validCategoryIds });
  let inserted = 0;

  // ON CONFLICT DO NOTHING on (user, account, fingerprint, occurrence):
  // re-running a commit after a network failure inserts only what is
  // missing. RETURNING then lists exactly the rows that were new.
  for (let index = 0; index < rows.length; index += 500) {
    const { data, error: insertError } = await client
      .from(FINANCE_TABLES.transactions)
      .upsert(rows.slice(index, index + 500), { onConflict: "user_id,account_id,fingerprint,occurrence", ignoreDuplicates: true })
      .select("id");

    if (insertError) {
      console.error("[finance] transaction insert failed", insertError.code ?? "");
      return fail(500, "storage_error", "Atlas could not save the transactions. Nothing is lost: run the import again to finish it.");
    }

    inserted += (data as unknown[] | null)?.length ?? 0;
  }

  const total = preview.sections.reduce((sum, section) => sum + section.transactions.length, 0);
  const { data: updated, error: updateError } = await client
    .from(FINANCE_TABLES.imports)
    .update({ status: "committed", committed_at: new Date().toISOString(), preview: null })
    .eq("id", importId)
    .eq("user_id", userId)
    .select(IMPORT_COLUMNS)
    .single();

  if (updateError || !updated) return fail(500, "storage_error", "The transactions were saved, but the import could not be marked as finished. Refresh to check.");

  return { ok: true, value: { inserted, skipped: total - inserted, importRecord: mapImport(updated as ImportRow) } };
}

// ---------------------------------------------------------------------
// Cancel / delete
// ---------------------------------------------------------------------

// A pending or failed import is simply discarded. A committed import is
// removed together with the transactions it created (and, through the
// foreign keys, its statement records and any transfer links on them).
export async function deleteStatementImport(client: SupabaseClient, userId: string, importId: string): Promise<ServiceResult<Readonly<{ deletedTransactions: number }>>> {
  const { data: row, error } = await client.from(FINANCE_TABLES.imports).select("id,status,storage_path").eq("id", importId).eq("user_id", userId).maybeSingle();

  if (error) return fail(500, "storage_error", "Atlas could not load this import.");
  if (!row) return fail(404, "not_found", "This import no longer exists.");

  const { status, storage_path: storagePath } = row as { status: string; storage_path: string | null };
  let deletedTransactions = 0;

  if (status === "committed") {
    const { data, error: deleteError } = await client.from(FINANCE_TABLES.transactions).delete().eq("user_id", userId).eq("import_id", importId).select("id");
    if (deleteError) return fail(500, "storage_error", "Atlas could not delete this import's transactions.");
    deletedTransactions = (data as unknown[] | null)?.length ?? 0;
  }

  if (storagePath) {
    await client.storage.from(STATEMENTS_BUCKET).remove([storagePath]);
  }

  const { error: importError } = await client.from(FINANCE_TABLES.imports).delete().eq("id", importId).eq("user_id", userId);
  if (importError) return fail(500, "storage_error", "Atlas could not delete this import.");

  return { ok: true, value: { deletedTransactions } };
}
