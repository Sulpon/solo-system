import { describe, expect, it } from "vitest";
import { countSkippedZeroAmountLines } from "../parsers/alatau";
import { parseCsvRows, parseCsvStatement } from "../parsers/csv";
import { identifyStatement, parseStatementDocument } from "../parsers/registry";
import { StatementParseError } from "../parsers/types";
import { documentFromMarkup } from "../pdf/lines";
import { reconcileSection } from "../reconciliation";
import { ALATAU, KASPI_HEADER, REVOLUT_EN, REVOLUT_RU, UNKNOWN_DOCUMENT } from "./fixtures/statements";

describe("Revolut (English)", () => {
  const statement = parseStatementDocument(documentFromMarkup(REVOLUT_EN));
  const [current, vault] = statement.sections;

  it("is detected as Revolut and split into current account and vault", () => {
    expect(statement.parserId).toBe("revolut");
    expect(statement.sections).toHaveLength(2);
    expect(current.account).toMatchObject({ bankName: "Revolut", currency: "EUR", product: "current", accountIdentifier: "•••• 1234" });
    expect(vault.account.product).toBe("vault");
  });

  it("reads only booked lines, across the page break, and ignores pending and reverted sections", () => {
    expect(current.transactions.map((transaction) => transaction.amountMinor)).toEqual([-700, 5000, -1250, -40, -40, -2100, -1001, -5000]);
    expect(current.transactions.some((transaction) => transaction.description.includes("Pending Shop"))).toBe(false);
  });

  it("takes direction from the column, not the text", () => {
    expect(current.transactions[1]).toMatchObject({ amountMinor: 5000, merchant: "Jane Example" });
    expect(current.transactions[0]).toMatchObject({ amountMinor: -700, merchant: "JOHN EXAMPLE" });
  });

  it("captures fees, foreign currency and counterparties without card numbers", () => {
    const cash = current.transactions[5];
    expect(cash.feeMinor).toBe(100);
    const pizza = current.transactions[6];
    expect(pizza).toMatchObject({ originalAmountMinor: -24000, originalCurrency: "CZK" });
    expect(statement.sections.flatMap((section) => section.transactions).some((transaction) => transaction.description.includes("400000"))).toBe(false);
    expect(current.transactions[2].description).toContain("To: Despar, Padova");
  });

  it("does not attach footer legal text to the last line", () => {
    expect(current.transactions[4].description).not.toContain("Lithuania");
  });

  it("reconciles every section to the cent with no issues", () => {
    expect(reconcileSection(current)).toMatchObject({ status: "balanced", differenceMinor: 0 });
    expect(reconcileSection(vault)).toMatchObject({ status: "balanced", differenceMinor: 0 });
    expect(statement.issues.filter((issue) => issue.severity !== "info")).toEqual([]);
    expect(current.balances).toMatchObject({ periodStart: "2024-11-01", periodEnd: "2024-11-30", openingBalanceMinor: 10000, closingBalanceMinor: 4869 });
  });
});

describe("Revolut (Russian)", () => {
  const statement = parseStatementDocument(documentFromMarkup(REVOLUT_RU));

  it("parses comma decimals and Russian dates, skipping pending and declined lines", () => {
    expect(statement.sections).toHaveLength(1);
    const [section] = statement.sections;
    expect(section.transactions.map((transaction) => [transaction.bookedOn, transaction.amountMinor])).toEqual([
      ["2026-10-01", -300],
      ["2026-10-02", 126200],
      ["2026-10-03", -5500],
    ]);
    expect(section.balances).toMatchObject({ periodStart: "2026-10-01", periodEnd: "2026-10-27", openingBalanceMinor: 1000, closingBalanceMinor: 121400 });
    expect(reconcileSection(section).status).toBe("balanced");
  });

  it("strips transfer wording from merchants and masks IBANs in descriptions", () => {
    const [section] = statement.sections;
    expect(section.transactions[1].merchant).toBe("EXAMPLE CORP");
    expect(section.transactions[2].merchant).toBe("JOHN EXAMPLE");
    expect(section.transactions[1].description).not.toContain("IE00TEST00000000000000");
  });
});

describe("Revolut statement concatenated with itself", () => {
  it("yields one section per statement block", () => {
    const statement = parseStatementDocument(documentFromMarkup(`${REVOLUT_EN}\n${REVOLUT_EN.replace(/=== PAGE (\d)/g, (_, page) => `=== PAGE ${Number(page) + 2}`)}`));
    expect(statement.sections).toHaveLength(4);
    expect(statement.sections.every((section) => reconcileSection(section).status === "balanced")).toBe(true);
  });
});

describe("Alatau City Bank", () => {
  const document = documentFromMarkup(ALATAU);
  const statement = parseStatementDocument(document);
  const [kzt, usd, eur] = statement.sections;

  it("finds one section per currency account", () => {
    expect(statement.parserId).toBe("alatau");
    expect(statement.sections.map((section) => section.account.currency)).toEqual(["KZT", "USD", "EUR"]);
    expect(kzt.account.accountIdentifier).toBe("•••• 1111");
  });

  it("reads balances printed on the line after their label", () => {
    expect(kzt.balances).toMatchObject({ openingBalanceMinor: 100000, closingBalanceMinor: 1514287, reportedCreditsMinor: 5000000, reportedDebitsMinor: 3585713 });
    expect(kzt.balances.periodStart).toBe("2023-04-01");
  });

  it("orders lines oldest first and signs them from the in/out columns", () => {
    expect(kzt.transactions.map((transaction) => [transaction.bookedOn, transaction.amountMinor])).toEqual([
      ["2023-04-20", 5000000],
      ["2023-04-28", -1570713],
      ["2023-05-23", -2000000],
      ["2023-05-23", -15000],
    ]);
  });

  it("keeps the original currency of a foreign card purchase", () => {
    expect(kzt.transactions[1]).toMatchObject({ originalAmountMinor: -3095, originalCurrency: "EUR", currency: "KZT" });
  });

  it("reads references, which a transfer and its fee share", () => {
    expect(kzt.transactions[2].reference).toBe("REF0001");
    expect(kzt.transactions[3].reference).toBe("REF0001");
  });

  it("cleans salary descriptions into a merchant", () => {
    expect(kzt.transactions[0].merchant).toBe("Зачисление зарплаты");
  });

  it("reconciles; flags the bank's own inconsistent EUR totals only as information", () => {
    expect(reconcileSection(kzt).status).toBe("balanced");
    expect(usd.transactions).toHaveLength(0);
    expect(reconcileSection(eur).status).toBe("balanced");
    const eurIssues = statement.issues.filter((issue) => issue.sectionIndex === 2);
    expect(eurIssues.map((issue) => [issue.code, issue.severity])).toEqual([
      ["credits_mismatch", "info"],
      ["debits_mismatch", "info"],
    ]);
    expect(countSkippedZeroAmountLines(document)).toBe(0);
  });
});

describe("statement identification", () => {
  it("refuses recognised banks without a verified parser", () => {
    expect(identifyStatement(documentFromMarkup(KASPI_HEADER))).toEqual({ kind: "unsupported_bank", bankName: "Kaspi Bank" });
    expect(() => parseStatementDocument(documentFromMarkup(KASPI_HEADER))).toThrow(/Kaspi Bank statements are not supported yet/);
  });

  it("refuses unknown documents with a clear error", () => {
    try {
      parseStatementDocument(documentFromMarkup(UNKNOWN_DOCUMENT));
      throw new Error("expected a failure");
    } catch (error) {
      expect(error).toBeInstanceOf(StatementParseError);
      expect((error as StatementParseError).code).toBe("unrecognized");
    }
  });

  it("is not fooled by a bank named inside a transaction description", () => {
    const withMention = ALATAU.replace("MOBILE BANK", "Перевод клиенту Kaspi Bank");
    expect(identifyStatement(documentFromMarkup(withMention)).kind).toBe("supported");
  });
});

describe("CSV import", () => {
  const options = { defaultCurrency: "EUR", dateOrder: "dmy" as const, accountName: "Example bank" };

  it("parses quoted fields containing delimiters and newlines", () => {
    expect(parseCsvRows('a,b\n"x, y","line1\nline2"\n', ",")).toEqual([
      ["a", "b"],
      ["x, y", "line1\nline2"],
    ]);
  });

  it("reads semicolon files with comma decimals and a signed amount column", () => {
    const csv = "Дата;Описание;Сумма;Валюта\n01.10.2026;Spar Padova;-12,50;EUR\n02.10.2026;Salary October;1 500,00;EUR\n";
    const statement = parseCsvStatement(csv, options);
    expect(statement.sections[0].transactions.map((transaction) => [transaction.bookedOn, transaction.amountMinor])).toEqual([
      ["2026-10-01", -1250],
      ["2026-10-02", 150000],
    ]);
  });

  it("reads separate debit and credit columns", () => {
    const csv = "date,description,money out,money in\n2026-10-01,Coffee,3.20,\n2026-10-02,Refund,,3.20\n";
    expect(parseCsvStatement(csv, options).sections[0].transactions.map((transaction) => transaction.amountMinor)).toEqual([-320, 320]);
  });

  it("splits currencies into separate sections and never mixes them", () => {
    const csv = "date,description,amount,currency\n2026-10-01,A,-1.00,EUR\n2026-10-01,B,-500,KZT\n";
    expect(parseCsvStatement(csv, options).sections.map((section) => section.account.currency)).toEqual(["EUR", "KZT"]);
  });

  it("rejects the whole file when any row is unreadable", () => {
    const csv = "date,description,amount\n2026-10-01,A,-1.00\nnot a date,B,-2.00\n";
    expect(() => parseCsvStatement(csv, options)).toThrow(/Row 3: the date could not be read/);
  });

  it("explains which columns are missing", () => {
    expect(() => parseCsvStatement("when,what\n1,2\n", options)).toThrow(/header row with a date column/);
  });
});
