import { containsKeyword, normalizeMerchant, normalizeText } from "../text";
import type { CategorizationMethod, CategoryRule, Direction, FinanceCategory, RuleMatchType } from "../types";
import { BUILTIN_RULES, type BuiltinRule } from "./builtin-rules";

// Deterministic categorisation. Same input, same rules -> same category,
// on the server during import and in the browser when re-applying rules.
//
// Order of precedence:
//   1. The user's own rules, highest priority first. Within one priority,
//      an exact merchant match beats starts-with beats contains, and a
//      longer pattern beats a shorter one.
//   2. Built-in rules (builtin-rules.ts), first match wins.
//   3. Nothing: the transaction is left uncategorised for review.
//
// A disabled category is never assigned, by either kind of rule.

export type CategorizationInput = Readonly<{
  merchant: string | null;
  description: string;
  amountMinor: number;
  accountId: string | null;
  // Parser id of the statement the line came from ("revolut", "csv" ...).
  bank: string | null;
}>;

export type CategorizationContext = Readonly<{
  rules: ReadonlyArray<CategoryRule>;
  categories: ReadonlyArray<FinanceCategory>;
}>;

export type CategorizationResult = Readonly<{
  categoryId: string | null;
  method: Exclude<CategorizationMethod, "manual">;
  ruleId: string | null;
  // Which built-in rule matched, for explaining the decision in the UI.
  builtinRuleId: string | null;
}>;

const UNCATEGORISED: CategorizationResult = { categoryId: null, method: "none", ruleId: null, builtinRuleId: null };

const SPECIFICITY: Readonly<Record<RuleMatchType, number>> = { equals: 3, starts_with: 2, contains: 1 };

export function directionOf(amountMinor: number): Direction {
  return amountMinor < 0 ? "out" : "in";
}

// The user's rules in the order they are tried. Exported so the rules
// editor can show the same order the engine uses.
export function orderUserRules(rules: ReadonlyArray<CategoryRule>): CategoryRule[] {
  return [...rules].sort(
    (first, second) =>
      second.priority - first.priority ||
      SPECIFICITY[second.matchType] - SPECIFICITY[first.matchType] ||
      second.pattern.length - first.pattern.length ||
      first.createdAt.localeCompare(second.createdAt) ||
      first.id.localeCompare(second.id),
  );
}

function normalizeFor(field: CategoryRule["field"], text: string): string {
  return field === "merchant" ? normalizeMerchant(text) : normalizeText(text);
}

function fieldTexts(rule: CategoryRule, input: CategorizationInput): string[] {
  const merchant = normalizeMerchant(input.merchant ?? "");
  const description = normalizeText(input.description);

  if (rule.field === "merchant") return [merchant];
  if (rule.field === "description") return [description];
  return [merchant, description];
}

export function userRuleMatches(rule: CategoryRule, input: CategorizationInput): boolean {
  if (!rule.isEnabled) return false;
  if (rule.accountId && rule.accountId !== input.accountId) return false;
  if (rule.direction && rule.direction !== directionOf(input.amountMinor)) return false;

  const pattern = normalizeFor(rule.field === "merchant" ? "merchant" : "description", rule.pattern);

  if (!pattern) return false;

  return fieldTexts(rule, input).some((text) => {
    if (!text) return false;
    if (rule.matchType === "equals") return text === pattern;
    if (rule.matchType === "starts_with") return text.startsWith(pattern);
    return text.includes(pattern);
  });
}

export function builtinRuleMatches(rule: BuiltinRule, input: CategorizationInput): boolean {
  if (rule.direction && rule.direction !== directionOf(input.amountMinor)) return false;
  if (rule.banks && (!input.bank || !rule.banks.includes(input.bank))) return false;

  const description = normalizeText(input.description);

  if (rule.startsWith?.some((prefix) => description.startsWith(normalizeText(prefix) + (prefix.endsWith(" ") ? " " : "")))) {
    return true;
  }

  if (rule.keywords) {
    const haystack = normalizeText(`${input.merchant ?? ""} ${input.description}`);
    return rule.keywords.some((keyword) => containsKeyword(haystack, normalizeText(keyword)));
  }

  return false;
}

export function categorizeTransaction(input: CategorizationInput, context: CategorizationContext): CategorizationResult {
  const enabledCategoryIds = new Set(context.categories.filter((category) => category.isEnabled).map((category) => category.id));

  for (const rule of orderUserRules(context.rules)) {
    if (enabledCategoryIds.has(rule.categoryId) && userRuleMatches(rule, input)) {
      return { categoryId: rule.categoryId, method: "rule_user", ruleId: rule.id, builtinRuleId: null };
    }
  }

  const categoryIdBySlug = new Map(
    context.categories.filter((category) => category.isEnabled && category.slug).map((category) => [category.slug as string, category.id]),
  );

  for (const rule of BUILTIN_RULES) {
    const categoryId = categoryIdBySlug.get(rule.categorySlug);

    if (categoryId && builtinRuleMatches(rule, input)) {
      return { categoryId, method: "rule_builtin", ruleId: null, builtinRuleId: rule.id };
    }
  }

  return UNCATEGORISED;
}
