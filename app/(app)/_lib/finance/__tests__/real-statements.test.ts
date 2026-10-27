// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "../pdf/extract-text";
import { identifyStatement, parseStatementDocument } from "../parsers/registry";
import { reconcileSection } from "../reconciliation";

// Opt-in check against REAL bank statements on this machine.
//
//   FINANCE_REAL_STATEMENTS_DIR=/path/to/pdfs npm test -- real-statements
//
// Nothing from those files is committed or printed beyond counts and
// reconciliation status. Skipped entirely when the variable is unset (CI,
// other machines). Every recognised statement must reconcile to the cent.

const directory = process.env.FINANCE_REAL_STATEMENTS_DIR;
const files = directory ? readdirSync(directory).filter((name) => name.toLowerCase().endsWith(".pdf")) : [];

describe.skipIf(!directory)("real statements", () => {
  it.each(files)("%s parses and reconciles", async (name) => {
    const document = await extractPdfText(new Uint8Array(readFileSync(join(directory!, name))));
    const identification = identifyStatement(document);

    if (identification.kind !== "supported") {
      console.info(`[real-statements] ${name}: ${identification.kind}`);
      return;
    }

    const statement = parseStatementDocument(document);

    for (const section of statement.sections) {
      const result = reconcileSection(section);
      console.info(
        `[real-statements] ${name} :: ${statement.bankName} ${section.account.currency}/${section.account.product} ${section.balances.periodStart}..${section.balances.periodEnd} lines=${section.transactions.length} status=${result.status} diff=${result.differenceMinor}`,
      );
      expect(section.account.accountIdentifier).toMatch(/^•••• [0-9A-Z]{4}$/);
      expect(result.status === "balanced" || (result.status === "unverifiable" && section.transactions.length === 0)).toBe(true);
    }

    const blocking = statement.issues.filter((issue) => issue.severity !== "info" && issue.code !== "balances_missing");
    expect(blocking).toEqual([]);
  });
});
