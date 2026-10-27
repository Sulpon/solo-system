import { DEFAULT_CATEGORIES } from "../categorization/default-categories";
import type { CategoryRule, FinanceAccount, FinanceCategory, FinanceTransaction } from "../types";

// Small builders so each test states only what it is about.

export const CATEGORIES: FinanceCategory[] = DEFAULT_CATEGORIES.map((category, index) => ({
  id: `cat-${category.slug}`,
  slug: category.slug,
  name: category.name,
  kind: category.kind,
  color: category.color,
  isEnabled: true,
  isSystem: true,
  sortOrder: index,
}));

export const categoryId = (slug: string) => `cat-${slug}`;

export function account(overrides: Partial<FinanceAccount> = {}): FinanceAccount {
  return { id: "acc-1", name: "Revolut EUR", bank: "revolut", accountIdentifier: "•••• 1234", currency: "EUR", product: "current", isArchived: false, ...overrides };
}

let counter = 0;

export function transaction(overrides: Partial<FinanceTransaction> = {}): FinanceTransaction {
  counter += 1;
  return {
    id: `tx-${counter}`,
    accountId: "acc-1",
    statementId: null,
    importId: null,
    bookedOn: "2026-10-10",
    postedOn: null,
    descriptionOriginal: "Something",
    merchant: null,
    amountMinor: -1000,
    currency: "EUR",
    originalAmountMinor: null,
    originalCurrency: null,
    feeMinor: null,
    bankReference: null,
    categoryId: null,
    categorizationMethod: "none",
    categorizationRuleId: null,
    reviewStatus: "needs_review",
    source: "pdf",
    fingerprint: `fp-${counter}`,
    occurrence: 1,
    possibleDuplicateOf: null,
    notes: null,
    createdAt: "2026-10-27T00:00:00Z",
    ...overrides,
  };
}

export function rule(overrides: Partial<CategoryRule> & Pick<CategoryRule, "pattern" | "categoryId">): CategoryRule {
  counter += 1;
  return {
    id: `rule-${counter}`,
    field: "merchant",
    matchType: "contains",
    accountId: null,
    direction: null,
    priority: 100,
    isEnabled: true,
    source: "user",
    createdAt: `2026-10-${String(counter % 28 + 1).padStart(2, "0")}T00:00:00Z`,
    ...overrides,
  };
}
