// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_STATEMENT_BYTES, validateStatementUpload } from "../server/file-validation";
import { commitStatementImport, createStatementImport, deleteStatementImport, parseCommitDecisions } from "../server/import-service";
import { createFakeClient, createFakeDatabase, type FakeDatabase } from "./fixtures/fake-supabase";
import { pdfFromMarkup } from "./fixtures/build-pdf";
import { REVOLUT_EN } from "./fixtures/statements";

const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CSV_OPTIONS = { currency: "", dateOrder: "dmy" as const, accountName: "" };
const NO_DECISIONS = { sections: [], transactions: [] };

const pdfFile = (markup = REVOLUT_EN) => ({ name: "statement.pdf", type: "application/pdf", bytes: pdfFromMarkup(markup) });

describe("upload validation", () => {
  const pdfBytes = pdfFromMarkup(REVOLUT_EN);

  it("accepts a real PDF and a text CSV", () => {
    expect(validateStatementUpload("a.pdf", "application/pdf", pdfBytes)).toEqual({ ok: true, kind: "pdf" });
    expect(validateStatementUpload("a.csv", "text/csv", new TextEncoder().encode("date,description,amount\n"))).toEqual({ ok: true, kind: "csv" });
  });

  it.each([
    ["empty.pdf", "application/pdf", new Uint8Array(), /empty/],
    ["huge.pdf", "application/pdf", new Uint8Array(MAX_STATEMENT_BYTES + 1), /larger than 4 MB/],
    ["fake.pdf", "application/pdf", new TextEncoder().encode("hello"), /contents are not a PDF/],
    ["image.png", "image/png", pdfBytes, /Only PDF statements and CSV/],
    ["photo.pdf", "image/jpeg", pdfBytes, /not a PDF/],
    ["binary.csv", "text/csv", new Uint8Array([100, 0, 100]), /binary data/],
  ])("rejects %s", (name, type, bytes, message) => {
    const result = validateStatementUpload(name, type, bytes);
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toMatch(message);
  });
});

describe("statement import service", () => {
  let database: FakeDatabase;
  const alice = () => createFakeClient(database, ALICE);
  const bob = () => createFakeClient(database, BOB);

  beforeEach(() => {
    database = createFakeDatabase();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("parses, previews and stores the file privately under the user's own folder", async () => {
    const result = await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.importRecord.status).toBe("needs_review");
    expect(result.value.preview?.sections[0].transactions).toHaveLength(8);
    expect([...database.storage.keys()]).toEqual([`${ALICE}/${result.value.importRecord.id}.pdf`]);
    // Nothing reaches the transactions table before commit.
    expect(database.tables.get("finance_transactions") ?? []).toHaveLength(0);
  });

  it("records an unrecognised PDF as failed with a clear message, and keeps no file", async () => {
    const result = await createStatementImport(alice(), ALICE, pdfFile("=== PAGE 1\n[40]Quarterly newsletter with plenty of words and nothing else"), CSV_OPTIONS);
    expect(result).toMatchObject({ ok: false, status: 422, code: "unrecognized" });
    expect(database.storage.size).toBe(0);
    expect(database.tables.get("finance_statement_imports")?.[0]).toMatchObject({ status: "failed", error_code: "unrecognized" });
  });

  it("commits once: a second commit and a re-upload of the same file add nothing", async () => {
    const created = await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS);
    if (!created.ok) throw new Error("setup failed");
    const importId = created.value.importRecord.id;

    const first = await commitStatementImport(alice(), ALICE, importId, NO_DECISIONS);
    expect(first).toMatchObject({ ok: true, value: { inserted: 9, skipped: 0 } });

    const again = await commitStatementImport(alice(), ALICE, importId, NO_DECISIONS);
    expect(again).toMatchObject({ ok: true, value: { inserted: 0 } });

    const reupload = await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS);
    expect(reupload).toMatchObject({ ok: false, status: 409, code: "already_imported" });

    expect(database.tables.get("finance_transactions")).toHaveLength(9);
  });

  it("a different file holding the same statement is previewed as already imported", async () => {
    const created = await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS);
    if (!created.ok) throw new Error("setup failed");
    await commitStatementImport(alice(), ALICE, created.value.importRecord.id, NO_DECISIONS);

    // Same statement, exported again (different bytes: the generation date changed).
    const reexport = await createStatementImport(alice(), ALICE, pdfFile(REVOLUT_EN.replace("Generated on Dec 15, 2024", "Generated on Dec 20, 2024")), CSV_OPTIONS);
    if (!reexport.ok) throw new Error("re-export failed");
    const statuses = reexport.value.preview!.sections.flatMap((section) => section.transactions.map((transaction) => transaction.duplicate.status));
    expect(new Set(statuses)).toEqual(new Set(["exact"]));

    const committed = await commitStatementImport(alice(), ALICE, reexport.value.importRecord.id, NO_DECISIONS);
    expect(committed).toMatchObject({ ok: true, value: { inserted: 0 } });
    expect(database.tables.get("finance_transactions")).toHaveLength(9);
  });

  it("isolates users: another user can neither commit nor delete the import", async () => {
    const created = await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS);
    if (!created.ok) throw new Error("setup failed");
    const importId = created.value.importRecord.id;

    expect(await commitStatementImport(bob(), BOB, importId, NO_DECISIONS)).toMatchObject({ ok: false, status: 404 });
    expect(await deleteStatementImport(bob(), BOB, importId)).toMatchObject({ ok: false, status: 404 });
    expect(database.storage.size).toBe(1);
    expect(database.tables.get("finance_statement_imports")).toHaveLength(1);
  });

  it("isolates users: the same file uploaded by two users is two separate imports", async () => {
    expect((await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS)).ok).toBe(true);
    const bobs = await createStatementImport(bob(), BOB, pdfFile(), CSV_OPTIONS);
    expect(bobs).toMatchObject({ ok: true, value: { alreadyExisted: false } });
  });

  it("refuses to import into an account the user does not own", async () => {
    const bobsImport = await createStatementImport(bob(), BOB, pdfFile(), CSV_OPTIONS);
    if (!bobsImport.ok) throw new Error("setup failed");
    await commitStatementImport(bob(), BOB, bobsImport.value.importRecord.id, NO_DECISIONS);
    const bobsAccountId = database.tables.get("finance_accounts")!.find((row) => row.user_id === BOB)!.id as string;

    const created = await createStatementImport(alice(), ALICE, pdfFile(REVOLUT_EN.replace("Dec 15", "Dec 16")), CSV_OPTIONS);
    if (!created.ok) throw new Error("setup failed");
    const result = await commitStatementImport(alice(), ALICE, created.value.importRecord.id, {
      sections: [{ index: 0, accountId: bobsAccountId, accountName: "x" }],
      transactions: [],
    });
    expect(result).toMatchObject({ ok: false, status: 400, code: "invalid_account" });
  });

  it("cancelling a pending import removes the record and the stored file", async () => {
    const created = await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS);
    if (!created.ok) throw new Error("setup failed");

    expect(await deleteStatementImport(alice(), ALICE, created.value.importRecord.id)).toMatchObject({ ok: true, value: { deletedTransactions: 0 } });
    expect(database.storage.size).toBe(0);
    expect(database.tables.get("finance_statement_imports")).toHaveLength(0);
  });

  it("deleting a committed import removes exactly its transactions", async () => {
    const created = await createStatementImport(alice(), ALICE, pdfFile(), CSV_OPTIONS);
    if (!created.ok) throw new Error("setup failed");
    await commitStatementImport(alice(), ALICE, created.value.importRecord.id, NO_DECISIONS);

    expect(await deleteStatementImport(alice(), ALICE, created.value.importRecord.id)).toMatchObject({ ok: true, value: { deletedTransactions: 9 } });
    expect(database.tables.get("finance_transactions")).toHaveLength(0);
  });

  it("validates commit request bodies strictly", () => {
    expect(parseCommitDecisions({ sections: [], transactions: [] })).toEqual({ sections: [], transactions: [] });
    expect(parseCommitDecisions({ sections: [{ index: "0" }], transactions: [] })).toBeNull();
    expect(parseCommitDecisions({ sections: [], transactions: [{ key: "0:0", include: "yes", categoryId: null }] })).toBeNull();
    expect(parseCommitDecisions("nope")).toBeNull();
  });
});
