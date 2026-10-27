import { reconciliationIssues } from "../reconciliation";
import type { PdfDocumentText } from "../pdf/lines";
import { alatauParser } from "./alatau";
import { revolutParser } from "./revolut";
import { firstPageHeader } from "./shared";
import { StatementParseError, type ParsedSection, type ParsedStatement, type StatementParser } from "./types";

// Every parser Atlas can run. Adding a bank is one new module implementing
// StatementParser plus one entry here - nothing else changes.
export const STATEMENT_PARSERS: ReadonlyArray<StatementParser> = [revolutParser, alatauParser];

// Banks Atlas recognises but cannot yet parse, because no real statement
// has been available to verify a parser against. Recognising them gives
// the user an honest "not supported yet" instead of a generic failure, and
// guarantees a guessed layout is never used on their money.
const RECOGNISED_UNSUPPORTED_BANKS: ReadonlyArray<Readonly<{ name: string; pattern: RegExp }>> = [
  { name: "Kaspi Bank", pattern: /Kaspi\s*(Bank|Gold|\.kz)|CASPKZKA/i },
  { name: "Freedom Bank", pattern: /Freedom\s*(Finance\s*)?Bank|KSNVKZKA/i },
  { name: "Halyk Bank", pattern: /Народный Банк Казахстана|Halyk|HSBKKZKX/i },
  { name: "ForteBank", pattern: /ForteBank|IRTYKZKA/i },
  { name: "Bank CenterCredit", pattern: /CenterCredit|ЦентрКредит|KCJBKZKX/i },
];

export type StatementIdentification =
  | Readonly<{ kind: "supported"; parser: StatementParser }>
  | Readonly<{ kind: "unsupported_bank"; bankName: string }>
  | Readonly<{ kind: "unknown" }>;

export function identifyStatement(document: PdfDocumentText): StatementIdentification {
  const parser = STATEMENT_PARSERS.find((candidate) => candidate.detectStatement(document));

  if (parser) {
    return { kind: "supported", parser };
  }

  const header = firstPageHeader(document);
  const known = RECOGNISED_UNSUPPORTED_BANKS.find((bank) => bank.pattern.test(header));

  return known ? { kind: "unsupported_bank", bankName: known.name } : { kind: "unknown" };
}

// Runs a parser's interface methods and assembles the result. Throws
// StatementParseError when the output is not trustworthy enough to show
// as a preview at all; anything merely suspicious becomes an issue the
// user reviews.
export function runParser(parser: StatementParser, document: PdfDocumentText): ParsedStatement {
  const accounts = parser.extractAccountInfo(document);
  const balances = parser.extractStatementBalances(document);
  const transactions = parser.extractTransactions(document);

  if (accounts.length !== balances.length || accounts.length !== transactions.length) {
    throw new StatementParseError("inconsistent", "The statement was recognised, but its sections could not be read consistently.");
  }

  const sections: ParsedSection[] = accounts.map((account, index) => ({ index, account, balances: balances[index], transactions: transactions[index] }));

  if (sections.length === 0) {
    throw new StatementParseError("no_transactions", `This looks like a ${parser.bankName} statement, but no account sections could be read from it.`);
  }

  const draft: ParsedStatement = { parserId: parser.id, bankName: parser.bankName, sections, issues: [] };

  return {
    ...draft,
    issues: [...parser.validateStatement(draft), ...sections.flatMap((section) => reconciliationIssues(section))],
  };
}

export function parseStatementDocument(document: PdfDocumentText): ParsedStatement {
  const identification = identifyStatement(document);

  if (identification.kind === "unsupported_bank") {
    throw new StatementParseError(
      "unsupported_bank",
      `${identification.bankName} statements are not supported yet. Export the transactions as CSV and use the CSV import instead.`,
    );
  }

  if (identification.kind === "unknown") {
    throw new StatementParseError("unrecognized", "This PDF is not a statement format Atlas recognises. Supported: Revolut and Alatau City Bank. Other banks can be imported as CSV.");
  }

  return runParser(identification.parser, document);
}

export function supportedBankNames(): string[] {
  return STATEMENT_PARSERS.map((parser) => parser.bankName);
}
