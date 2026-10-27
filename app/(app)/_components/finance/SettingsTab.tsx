"use client";

import { useState } from "react";
import { categorizeTransaction, orderUserRules } from "../../_lib/finance/categorization/engine";
import {
  applyCategorizations,
  createCategory,
  createRule,
  deleteCategory,
  deleteRule,
  updateAccount,
  updateCategory,
  updateRule,
  type RuleInput,
} from "../../_lib/finance/repository/finance-repository";
import type { CategoryKind, CategoryRule, RuleField, RuleMatchType } from "../../_lib/finance/types";
import Card from "../Card";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { Badge, buttonClass, CategorySelect, EmptyState, inputClass, primaryButtonClass, SectionHeading } from "./FinanceUi";

// Categories, categorisation rules and accounts.

const KIND_LABELS: Readonly<Record<CategoryKind, string>> = {
  expense: "Spending",
  income: "Income",
  debt: "Debt",
  transfer: "Own transfer",
  exchange: "Exchange",
};

const FIELD_LABELS: Readonly<Record<RuleField, string>> = { merchant: "Merchant", description: "Description", any: "Merchant or description" };
const MATCH_LABELS: Readonly<Record<RuleMatchType, string>> = { contains: "contains", equals: "is exactly", starts_with: "starts with" };

const EMPTY_RULE: RuleInput = { field: "merchant", matchType: "contains", pattern: "", accountId: null, direction: null, categoryId: "", priority: 100 };

function CategoriesCard() {
  const snapshot = useFinanceSnapshot();
  const { mutate } = useFinanceData();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<CategoryKind>("expense");
  const [color, setColor] = useState("#a855f7");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <Card className="p-5">
      <SectionHeading title="Categories" detail="Built-in categories can be renamed and disabled; your own can also be deleted. Disabled categories are never assigned by rules." />
      <ul className="mt-4 divide-y divide-slate-800">
        {snapshot.categories.map((category) => {
          const draft = drafts[category.id] ?? category.name;
          return (
            <li key={category.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center">
              <input
                type="color"
                aria-label={`Colour of ${category.name}`}
                className="h-8 w-10 shrink-0 cursor-pointer rounded border border-slate-700 bg-transparent"
                value={category.color}
                onChange={(event) => void mutate((client, userId) => updateCategory(client, userId, category.id, { color: event.target.value }))}
              />
              <input
                aria-label="Category name"
                className={inputClass + " sm:flex-1 " + (category.isEnabled ? "" : "opacity-50")}
                value={draft}
                maxLength={80}
                onChange={(event) => setDrafts({ ...drafts, [category.id]: event.target.value })}
                onBlur={() => {
                  if (draft.trim() && draft !== category.name) void mutate((client, userId) => updateCategory(client, userId, category.id, { name: draft }), "Category renamed.");
                }}
              />
              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={category.kind === "income" ? "cyan" : category.kind === "expense" ? "purple" : "slate"}>{KIND_LABELS[category.kind]}</Badge>
                <button type="button" className={buttonClass} onClick={() => void mutate((client, userId) => updateCategory(client, userId, category.id, { isEnabled: !category.isEnabled }))}>
                  {category.isEnabled ? "Disable" : "Enable"}
                </button>
                {!category.isSystem ? (
                  <button type="button" className={buttonClass} onClick={() => void mutate((client, userId) => deleteCategory(client, userId, category.id), "Category deleted; its transactions now need review.")}>
                    Delete
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 grid gap-2 border-t border-slate-800 pt-4 sm:grid-cols-[1fr_170px_56px_auto]">
        <input aria-label="New category name" className={inputClass} placeholder="New category" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        <select aria-label="Category type" className={inputClass} value={kind} onChange={(event) => setKind(event.target.value as CategoryKind)}>
          {(Object.keys(KIND_LABELS) as CategoryKind[]).map((value) => (
            <option key={value} value={value}>
              {KIND_LABELS[value]}
            </option>
          ))}
        </select>
        <input type="color" aria-label="New category colour" className="h-10 w-full cursor-pointer rounded border border-slate-700 bg-transparent" value={color} onChange={(event) => setColor(event.target.value)} />
        <button
          type="button"
          className={primaryButtonClass}
          disabled={!name.trim()}
          onClick={() => void mutate((client, userId) => createCategory(client, userId, { name, kind, color }), "Category created.").then((ok) => ok && setName(""))}
        >
          Add
        </button>
      </div>
    </Card>
  );
}

function RulesCard() {
  const snapshot = useFinanceSnapshot();
  const { mutate, categoriesById, accountsById } = useFinanceData();
  const [draft, setDraft] = useState<RuleInput>({ ...EMPTY_RULE, categoryId: snapshot.categories.find((category) => category.isEnabled)?.id ?? "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const ordered = orderUserRules(snapshot.rules);

  // Re-run the rules over everything not set by hand.
  const reapply = () =>
    void mutate(async (client, userId) => {
      const accountBank = new Map(snapshot.accounts.map((account) => [account.id, account.bank]));
      const updates = snapshot.transactions
        .filter((transaction) => transaction.categorizationMethod !== "manual")
        .map((transaction) => ({
          transaction,
          result: categorizeTransaction(
            { merchant: transaction.merchant, description: transaction.descriptionOriginal, amountMinor: transaction.amountMinor, accountId: transaction.accountId, bank: accountBank.get(transaction.accountId) ?? null },
            { rules: snapshot.rules, categories: snapshot.categories },
          ),
        }))
        .filter(({ transaction, result }) => result.categoryId && (result.categoryId !== transaction.categoryId || result.ruleId !== transaction.categorizationRuleId))
        .map(({ transaction, result }) => ({ id: transaction.id, categoryId: result.categoryId as string, method: result.method as "rule_user" | "rule_builtin", ruleId: result.ruleId }));
      await applyCategorizations(client, userId, updates);
    }, "Rules re-applied to every transaction not categorised by hand.");

  const save = () =>
    void mutate(
      (client, userId) => (editingId ? updateRule(client, userId, editingId, { ...draft, isEnabled: true }) : createRule(client, userId, draft)),
      editingId ? "Rule updated." : "Rule created. It applies to future imports; use “Re-apply rules” for existing transactions.",
    ).then((ok) => {
      if (ok) {
        setDraft({ ...EMPTY_RULE, categoryId: draft.categoryId });
        setEditingId(null);
      }
    });

  const startEdit = (rule: CategoryRule) => {
    setEditingId(rule.id);
    setDraft({ field: rule.field, matchType: rule.matchType, pattern: rule.pattern, accountId: rule.accountId, direction: rule.direction, categoryId: rule.categoryId, priority: rule.priority });
  };

  return (
    <Card className="p-5">
      <SectionHeading
        title="Rules"
        detail="Your rules always run before Atlas's built-in merchant list, highest priority first. Matching ignores case and accents."
        action={
          <button type="button" className={buttonClass} onClick={reapply}>
            Re-apply rules
          </button>
        }
      />
      <div className="mt-4 grid gap-2 rounded-xl border border-slate-800 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <select aria-label="Field" className={inputClass} value={draft.field} onChange={(event) => setDraft({ ...draft, field: event.target.value as RuleField })}>
          {(Object.keys(FIELD_LABELS) as RuleField[]).map((field) => (
            <option key={field} value={field}>
              If {FIELD_LABELS[field].toLowerCase()}
            </option>
          ))}
        </select>
        <select aria-label="Match" className={inputClass} value={draft.matchType} onChange={(event) => setDraft({ ...draft, matchType: event.target.value as RuleMatchType })}>
          {(Object.keys(MATCH_LABELS) as RuleMatchType[]).map((match) => (
            <option key={match} value={match}>
              {MATCH_LABELS[match]}
            </option>
          ))}
        </select>
        <input aria-label="Text to match" className={inputClass} placeholder="e.g. Starbucks" value={draft.pattern} maxLength={200} onChange={(event) => setDraft({ ...draft, pattern: event.target.value })} />
        <select aria-label="Direction" className={inputClass} value={draft.direction ?? ""} onChange={(event) => setDraft({ ...draft, direction: (event.target.value || null) as RuleInput["direction"] })}>
          <option value="">Money in or out</option>
          <option value="out">Money out only</option>
          <option value="in">Money in only</option>
        </select>
        <select aria-label="Account" className={inputClass} value={draft.accountId ?? ""} onChange={(event) => setDraft({ ...draft, accountId: event.target.value || null })}>
          <option value="">Any account</option>
          {snapshot.accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <CategorySelect categories={snapshot.categories} value={draft.categoryId || null} includeUncategorised={false} onChange={(categoryId) => setDraft({ ...draft, categoryId: categoryId ?? "" })} />
          <input aria-label="Priority" title="Priority (higher runs first)" className={inputClass + " w-20"} type="number" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) || 0 })} />
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-3 lg:justify-end">
          {editingId ? (
            <button type="button" className={buttonClass} onClick={() => { setEditingId(null); setDraft({ ...EMPTY_RULE, categoryId: draft.categoryId }); }}>
              Cancel edit
            </button>
          ) : null}
          <button type="button" className={primaryButtonClass} disabled={!draft.pattern.trim() || !draft.categoryId} onClick={save}>
            {editingId ? "Save rule" : "Add rule"}
          </button>
        </div>
      </div>

      <div className="mt-4">
        {ordered.length === 0 ? (
          <EmptyState text="No rules yet. Rules are also created when you recategorise a transaction and choose to apply it to future ones." />
        ) : (
          <ul className="divide-y divide-slate-800">
            {ordered.map((rule) => (
              <li key={rule.id} className={"flex flex-col gap-2 py-2 text-sm sm:flex-row sm:items-center sm:justify-between " + (rule.isEnabled ? "" : "opacity-50")}>
                <p className="text-slate-300">
                  If {FIELD_LABELS[rule.field].toLowerCase()} {MATCH_LABELS[rule.matchType]} <strong className="text-white">“{rule.pattern}”</strong>
                  {rule.direction ? ` (money ${rule.direction})` : ""}
                  {rule.accountId ? ` on ${accountsById.get(rule.accountId)?.name ?? "an account"}` : ""} → <strong className="text-white">{categoriesById.get(rule.categoryId)?.name ?? "?"}</strong>
                  <span className="ml-2 text-xs text-slate-500">priority {rule.priority}{rule.source === "correction" ? " · from a correction" : ""}</span>
                </p>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className={buttonClass} onClick={() => startEdit(rule)}>
                    Edit
                  </button>
                  <button type="button" className={buttonClass} onClick={() => void mutate((client, userId) => updateRule(client, userId, rule.id, { ...rule, isEnabled: !rule.isEnabled }))}>
                    {rule.isEnabled ? "Disable" : "Enable"}
                  </button>
                  <button type="button" className={buttonClass} onClick={() => void mutate((client, userId) => deleteRule(client, userId, rule.id), "Rule deleted.")}>
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function AccountsCard() {
  const snapshot = useFinanceSnapshot();
  const { mutate } = useFinanceData();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  return (
    <Card className="p-5">
      <SectionHeading title="Accounts" detail="Accounts are created by imports (or when you add a transaction by hand). Archived accounts are hidden from balances." />
      <ul className="mt-4 divide-y divide-slate-800">
        {snapshot.accounts.length === 0 ? <EmptyState text="No accounts yet." /> : null}
        {snapshot.accounts.map((account) => {
          const draft = drafts[account.id] ?? account.name;
          return (
            <li key={account.id} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center">
              <input
                aria-label="Account name"
                className={inputClass + " sm:flex-1"}
                value={draft}
                maxLength={120}
                onChange={(event) => setDrafts({ ...drafts, [account.id]: event.target.value })}
                onBlur={() => {
                  if (draft.trim() && draft !== account.name) void mutate((client, userId) => updateAccount(client, userId, account.id, { name: draft }), "Account renamed.");
                }}
              />
              <span className="text-xs text-slate-500">
                {account.currency} · {account.bank}
                {account.accountIdentifier?.startsWith("•") ? ` · ${account.accountIdentifier}` : ""}
              </span>
              <button type="button" className={buttonClass} onClick={() => void mutate((client, userId) => updateAccount(client, userId, account.id, { isArchived: !account.isArchived }))}>
                {account.isArchived ? "Unarchive" : "Archive"}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function SettingsTab() {
  return (
    <div className="space-y-5">
      <RulesCard />
      <CategoriesCard />
      <AccountsCard />
    </div>
  );
}
