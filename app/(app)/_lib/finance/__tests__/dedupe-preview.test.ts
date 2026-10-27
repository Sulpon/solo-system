import { describe, expect, it } from "vitest";
import { assignOccurrences, classifyDuplicates, transactionFingerprint, type ExistingTransactionForDedupe } from "../dedupe";
import { buildImportPreview, buildTransactionRows, type CommitDecisions, type ImportPreview } from "../import-preview";
import { parseStatementDocument } from "../parsers/registry";
import { documentFromMarkup } from "../pdf/lines";
import { account, CATEGORIES, categoryId, rule } from "./helpers";
import { REVOLUT_EN } from "./fixtures/statements";

const base = { bookedOn: "2026-10-01", amountMinor: -45, currency: "EUR", description: "Selecta · To: Example Vending", reference: null };

describe("fingerprints", () => {
  it("are stable and ignore case, accents and punctuation", () => {
    expect(transactionFingerprint(base)).toBe(transactionFingerprint({ ...base, description: "SELECTA - to: example vending" }));
  });

  it("change with date, amount, currency or reference", () => {
    const fingerprint = transactionFingerprint(base);
    expect(transactionFingerprint({ ...base, bookedOn: "2026-10-02" })).not.toBe(fingerprint);
    expect(transactionFingerprint({ ...base, amountMinor: 45 })).not.toBe(fingerprint);
    expect(transactionFingerprint({ ...base, currency: "USD" })).not.toBe(fingerprint);
    expect(transactionFingerprint({ ...base, reference: "REF1" })).not.toBe(fingerprint);
  });

  it("number identical lines so genuine repeats stay separate", () => {
    expect(assignOccurrences(["a", "b", "a", "a"])).toEqual([1, 1, 2, 3]);
  });
});

describe("classifyDuplicates", () => {
  const stored = (overrides: Partial<ExistingTransactionForDedupe>): ExistingTransactionForDedupe => ({
    id: "old-1",
    bookedOn: "2026-10-01",
    amountMinor: -45,
    currency: "EUR",
    fingerprint: "fp-a",
    occurrence: 1,
    source: "pdf",
    ...overrides,
  });

  it("treats only the same fingerprint AND occurrence as already imported", () => {
    const verdicts = classifyDuplicates(
      [
        { bookedOn: "2026-10-01", amountMinor: -45, currency: "EUR", fingerprint: "fp-a", occurrence: 1 },
        { bookedOn: "2026-10-01", amountMinor: -45, currency: "EUR", fingerprint: "fp-a", occurrence: 2 },
      ],
      [stored({})],
    );
    expect(verdicts).toEqual([
      { status: "exact", matchId: "old-1" },
      { status: "new", matchId: null },
    ]);
  });

  it("flags same-day same-amount lines with different wording as possible, never exact", () => {
    const [verdict] = classifyDuplicates([{ bookedOn: "2026-10-01", amountMinor: -45, currency: "EUR", fingerprint: "fp-other-language", occurrence: 1 }], [stored({})]);
    expect(verdict).toEqual({ status: "possible", matchId: "old-1" });
  });

  it("does not flag a different day for bank lines, but allows slack for manual entries", () => {
    const candidate = { bookedOn: "2026-10-03", amountMinor: -45, currency: "EUR", fingerprint: "fp-b", occurrence: 1 };
    expect(classifyDuplicates([candidate], [stored({})])[0].status).toBe("new");
    expect(classifyDuplicates([candidate], [stored({ source: "manual" })])[0].status).toBe("possible");
  });

  it("lets one stored line explain only one new line", () => {
    const candidate = { bookedOn: "2026-10-01", amountMinor: -45, currency: "EUR", fingerprint: "fp-x", occurrence: 1 };
    const verdicts = classifyDuplicates([candidate, { ...candidate, occurrence: 2 }], [stored({})]);
    expect(verdicts.map((verdict) => verdict.status)).toEqual(["possible", "new"]);
  });
});

describe("import preview and commit", () => {
  const statement = parseStatementDocument(documentFromMarkup(REVOLUT_EN));
  const existingAccount = account({ id: "acc-rev", accountIdentifier: "•••• 1234" });
  const context = { accounts: [existingAccount], categories: CATEGORIES, rules: [], existingByAccount: new Map() };

  const commitAll = (preview: ImportPreview, decisions: CommitDecisions = { sections: [], transactions: [] }) =>
    buildTransactionRows(preview, decisions, {
      userId: "user-1",
      importId: "import-1",
      accountIdBySection: new Map(preview.sections.map((section) => [section.index, section.matchedAccountId ?? `new-${section.index}`])),
      statementIdBySection: new Map(),
      validCategoryIds: new Set(CATEGORIES.map((category) => category.id)),
    });

  it("matches the statement's current account and suggests categories", () => {
    const preview = buildImportPreview(statement, "pdf", context);
    expect(preview.sections[0].matchedAccountId).toBe("acc-rev");
    expect(preview.sections[1].matchedAccountId).toBeNull();
    expect(preview.sections[0].transactions[2].suggestion.categoryId).toBe(categoryId("groceries"));
    expect(preview.sections[0].reconciliation.status).toBe("balanced");
  });

  it("keeps two identical same-day purchases as two transactions", () => {
    const preview = buildImportPreview(statement, "pdf", context);
    const selecta = preview.sections[0].transactions.filter((transaction) => transaction.merchant === "Selecta");
    expect(selecta.map((transaction) => transaction.occurrence)).toEqual([1, 2]);
    expect(new Set(selecta.map((transaction) => transaction.fingerprint)).size).toBe(1);
  });

  it("importing the same statement twice adds nothing the second time", () => {
    const first = commitAll(buildImportPreview(statement, "pdf", context));
    const stored = first
      .filter((row) => row.account_id === "acc-rev")
      .map((row, index) => ({ id: `stored-${index}`, bookedOn: row.booked_on, amountMinor: row.amount_minor, currency: row.currency, fingerprint: row.fingerprint, occurrence: row.occurrence, source: "pdf" as const }));

    const second = buildImportPreview(statement, "pdf", { ...context, existingByAccount: new Map([["acc-rev", stored]]) });
    expect(second.sections[0].transactions.every((transaction) => transaction.duplicate.status === "exact")).toBe(true);
    expect(commitAll(second).filter((row) => row.account_id === "acc-rev")).toHaveLength(0);
  });

  it("lets decisions exclude and recategorise lines but never change amounts", () => {
    const preview = buildImportPreview(statement, "pdf", context);
    const rows = commitAll(preview, {
      sections: [],
      transactions: [
        { key: "0:0", include: false, categoryId: null },
        { key: "0:1", include: true, categoryId: categoryId("freelance") },
        { key: "0:2", include: true, categoryId: "someone-elses-category" },
      ],
    });
    const byDescription = new Map(rows.map((row) => [row.description_original, row]));

    expect(rows.some((row) => row.description_original.startsWith("To JOHN EXAMPLE"))).toBe(false);
    expect(byDescription.get(preview.sections[0].transactions[1].description)).toMatchObject({ category_id: categoryId("freelance"), categorization_method: "manual", review_status: "confirmed", amount_minor: 5000 });
    expect(byDescription.get(preview.sections[0].transactions[2].description)).toMatchObject({ category_id: null, review_status: "needs_review", amount_minor: -1250 });
  });

  it("applies the user's own rules during preview", () => {
    const mine = rule({ pattern: "jane example", categoryId: categoryId("freelance"), direction: "in" });
    const preview = buildImportPreview(statement, "pdf", { ...context, rules: [mine] });
    expect(preview.sections[0].transactions[1].suggestion).toMatchObject({ categoryId: categoryId("freelance"), method: "rule_user", ruleId: mine.id });
  });

  it("marks rows with no category, or a possible duplicate, for review", () => {
    const rows = commitAll(buildImportPreview(statement, "pdf", context));
    const uncategorised = rows.filter((row) => row.category_id === null);
    expect(uncategorised.length).toBeGreaterThan(0);
    expect(uncategorised.every((row) => row.review_status === "needs_review")).toBe(true);
  });
});
