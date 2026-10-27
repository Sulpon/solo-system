import type { CategoryKind } from "../types";

// The categories every user starts with. Seeded once per user by slug, so
// renaming, recolouring or disabling one is preserved forever after;
// built-in rules address categories by slug, never by name, so they keep
// working after a rename.

export type DefaultCategory = Readonly<{
  slug: string;
  name: string;
  kind: CategoryKind;
  color: string;
}>;

export const DEFAULT_CATEGORIES: ReadonlyArray<DefaultCategory> = [
  // Expenses
  { slug: "groceries", name: "Groceries", kind: "expense", color: "#22c55e" },
  { slug: "coffee", name: "Coffee", kind: "expense", color: "#a16207" },
  { slug: "restaurants", name: "Restaurants and takeaway", kind: "expense", color: "#f97316" },
  { slug: "transport", name: "Transport", kind: "expense", color: "#06b6d4" },
  { slug: "housing", name: "Rent and housing", kind: "expense", color: "#8b5cf6" },
  { slug: "utilities", name: "Utilities", kind: "expense", color: "#0ea5e9" },
  { slug: "shopping", name: "Shopping and clothing", kind: "expense", color: "#ec4899" },
  { slug: "health", name: "Health and personal care", kind: "expense", color: "#14b8a6" },
  { slug: "fitness", name: "Fitness and sports", kind: "expense", color: "#84cc16" },
  { slug: "education", name: "Education", kind: "expense", color: "#6366f1" },
  { slug: "subscriptions", name: "Software and subscriptions", kind: "expense", color: "#a855f7" },
  { slug: "travel", name: "Travel and accommodation", kind: "expense", color: "#3b82f6" },
  { slug: "entertainment", name: "Entertainment", kind: "expense", color: "#f43f5e" },
  { slug: "bank-fees", name: "Bank fees", kind: "expense", color: "#64748b" },
  { slug: "cash", name: "Cash withdrawals", kind: "expense", color: "#94a3b8" },
  { slug: "transfers-sent", name: "Transfers sent", kind: "expense", color: "#e879f9" },
  { slug: "other-expense", name: "Other expenses", kind: "expense", color: "#78716c" },
  // Debt: tracked apart from living costs, because a payment usually mixes
  // principal and interest that a statement cannot separate.
  { slug: "debt-payments", name: "Loan and debt payments", kind: "debt", color: "#ef4444" },
  // Income
  { slug: "salary", name: "Salary", kind: "income", color: "#10b981" },
  { slug: "freelance", name: "Freelance and contract work", kind: "income", color: "#34d399" },
  { slug: "business-income", name: "Business income", kind: "income", color: "#2dd4bf" },
  { slug: "refunds", name: "Refunds", kind: "income", color: "#a3e635" },
  { slug: "transfers-received", name: "Transfers received", kind: "income", color: "#67e8f9" },
  { slug: "other-income", name: "Other income", kind: "income", color: "#86efac" },
  // Not income or spending
  { slug: "own-transfers", name: "Transfers between own accounts", kind: "transfer", color: "#22d3ee" },
  { slug: "currency-exchange", name: "Currency exchange", kind: "exchange", color: "#fbbf24" },
  { slug: "card-repayment", name: "Credit card repayment", kind: "debt", color: "#fb7185" },
];
