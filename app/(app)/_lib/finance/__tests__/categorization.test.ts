import { describe, expect, it } from "vitest";
import { categorizeTransaction, orderUserRules, type CategorizationInput } from "../categorization/engine";
import { CATEGORIES, categoryId, rule } from "./helpers";

const input = (overrides: Partial<CategorizationInput>): CategorizationInput => ({
  merchant: null,
  description: "",
  amountMinor: -500,
  accountId: "acc-1",
  bank: "revolut",
  ...overrides,
});

const categorize = (value: Partial<CategorizationInput>, rules = [] as ReturnType<typeof rule>[], categories = CATEGORIES) =>
  categorizeTransaction(input(value), { rules, categories });

describe("built-in rules", () => {
  it.each([
    [{ merchant: "Starbucks", description: "Starbucks · To: Starbucks Milano" }, "coffee"],
    [{ merchant: "Spar", description: "Spar · To: Despar, Padova" }, "groceries"],
    [{ merchant: "Atac", description: "Atac · Получатель: Atac Tap&go, Roma" }, "transport"],
    [{ merchant: "Netflix", description: "Netflix.com" }, "subscriptions"],
    [{ merchant: "Uber Eats", description: "Uber Eats order" }, "restaurants"],
    [{ merchant: "Uber", description: "Uber trip" }, "transport"],
    [{ description: "Снятие наличных Cash Isp 0093-padov" }, "cash"],
    [{ description: "Комиссия · Комиссия за перевод", bank: "alatau" }, "bank-fees"],
    [{ description: "To EUR Rent" }, "own-transfers"],
    [{ description: "To JOHN EXAMPLE · To: JOHN EXAMPLE" }, "transfers-sent"],
    [{ description: "Перевод · Перевод собственных средств на счет KZ00", bank: "alatau" }, "own-transfers"],
  ])("categorises %j", (value, slug) => {
    expect(categorize(value).categoryId).toBe(categoryId(slug));
    expect(categorize(value).method).toBe("rule_builtin");
  });

  it("respects direction: salary only counts as money in", () => {
    expect(categorize({ description: "Пополнение · Зачисление зарплаты: popolnenie", amountMinor: 5000000, bank: "alatau" }).categoryId).toBe(categoryId("salary"));
    expect(categorize({ description: "Зачисление зарплаты", amountMinor: -100 }).categoryId).toBeNull();
  });

  it("does not guess when nothing in the text supports a category", () => {
    expect(categorize({ merchant: "EXAMPLE CORP", description: "Платеж от EXAMPLE CORP", amountMinor: 126200 })).toEqual({ categoryId: null, method: "none", ruleId: null, builtinRuleId: null });
    expect(categorize({ merchant: "Alex Example", description: "Alex Example · From: Alex Example, Almaty", amountMinor: 5000 }).categoryId).toBeNull();
  });

  it("only applies bank-specific phrasing to that bank", () => {
    expect(categorize({ description: "To EUR Rent", bank: "csv" }).categoryId).not.toBe(categoryId("own-transfers"));
  });

  it("never assigns a disabled category", () => {
    const withoutCoffee = CATEGORIES.map((category) => (category.slug === "coffee" ? { ...category, isEnabled: false } : category));
    expect(categorize({ merchant: "Starbucks", description: "Starbucks" }, [], withoutCoffee).categoryId).toBeNull();
  });
});

describe("user rules", () => {
  it("outrank built-in rules", () => {
    const mine = rule({ pattern: "starbucks", categoryId: categoryId("restaurants") });
    const result = categorize({ merchant: "Starbucks", description: "Starbucks" }, [mine]);
    expect(result).toMatchObject({ categoryId: categoryId("restaurants"), method: "rule_user", ruleId: mine.id });
  });

  it("are tried by priority, then exact before starts-with before contains, then longer pattern", () => {
    const contains = rule({ pattern: "coffee", matchType: "contains", categoryId: categoryId("coffee") });
    const equals = rule({ pattern: "blue coffee", matchType: "equals", categoryId: categoryId("restaurants") });
    const urgent = rule({ pattern: "blue", matchType: "contains", priority: 500, categoryId: categoryId("shopping") });

    expect(orderUserRules([contains, equals]).map((candidate) => candidate.id)).toEqual([equals.id, contains.id]);
    expect(categorize({ merchant: "Blue Coffee", description: "Blue Coffee" }, [contains, equals]).categoryId).toBe(categoryId("restaurants"));
    expect(categorize({ merchant: "Blue Coffee", description: "Blue Coffee" }, [contains, equals, urgent]).categoryId).toBe(categoryId("shopping"));
  });

  it("match merchants by normalised identity, so store numbers do not matter", () => {
    const correction = rule({ pattern: "Delikomat Cz 47493", matchType: "equals", source: "correction", categoryId: categoryId("coffee") });
    expect(categorize({ merchant: "Delikomat Cz 50341", description: "cafe+co" }, [correction]).ruleId).toBe(correction.id);
  });

  it("can be limited to an account and a direction", () => {
    const onlyIncoming = rule({ pattern: "example", direction: "in", categoryId: categoryId("freelance") });
    const otherAccount = rule({ pattern: "example", accountId: "acc-2", categoryId: categoryId("business-income") });

    expect(categorize({ merchant: "Example Corp", amountMinor: 1000 }, [onlyIncoming, otherAccount]).categoryId).toBe(categoryId("freelance"));
    expect(categorize({ merchant: "Example Corp", amountMinor: -1000 }, [onlyIncoming, otherAccount]).categoryId).toBeNull();
    expect(categorize({ merchant: "Example Corp", amountMinor: -1000, accountId: "acc-2" }, [onlyIncoming, otherAccount]).categoryId).toBe(categoryId("business-income"));
  });

  it("can match the description instead of the merchant", () => {
    const byDescription = rule({ pattern: "payouts", field: "description", categoryId: categoryId("freelance") });
    expect(categorize({ merchant: "EXAMPLE CORP", description: "Платеж от EXAMPLE CORP · Реквизиты: EXAMPLE PAYOUTS", amountMinor: 100 }, [byDescription]).categoryId).toBe(
      categoryId("freelance"),
    );
  });

  it("are skipped when disabled", () => {
    const disabled = rule({ pattern: "starbucks", categoryId: categoryId("restaurants"), isEnabled: false });
    expect(categorize({ merchant: "Starbucks", description: "Starbucks" }, [disabled]).categoryId).toBe(categoryId("coffee"));
  });
});
