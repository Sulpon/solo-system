"use client";

import { useState } from "react";
import { categorizeTransaction } from "../../_lib/finance/categorization/engine";
import { applyCategorizations, createRule, updateTransactions } from "../../_lib/finance/repository/finance-repository";
import { normalizeMerchant } from "../../_lib/finance/text";
import type { FinanceTransaction } from "../../_lib/finance/types";
import Modal from "../Modal";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { buttonClass, CategorySelect, formatDate, inputClass, Money, primaryButtonClass } from "./FinanceUi";

// Edit one transaction. The bank's original description is shown but can
// never be changed (the database enforces it too). Changing the category
// can teach Atlas: "apply to future transactions from this merchant"
// saves an exact-merchant rule, and optionally re-applies it to this
// merchant's other lines that were not set by hand.

export default function TransactionEditor({ transaction, onClose }: Readonly<{ transaction: FinanceTransaction; onClose: () => void }>) {
  const snapshot = useFinanceSnapshot();
  const { mutate, accountsById, categoriesById } = useFinanceData();
  const [merchant, setMerchant] = useState(transaction.merchant ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(transaction.categoryId);
  const [notes, setNotes] = useState(transaction.notes ?? "");
  const [rememberForMerchant, setRememberForMerchant] = useState(false);
  const [applyToExisting, setApplyToExisting] = useState(true);
  const [saving, setSaving] = useState(false);

  const merchantKey = normalizeMerchant(merchant || transaction.merchant || "");
  const categoryChanged = categoryId !== transaction.categoryId;
  const sameMerchant = merchantKey
    ? snapshot.transactions.filter(
        (other) => other.id !== transaction.id && other.categorizationMethod !== "manual" && normalizeMerchant(other.merchant ?? "") === merchantKey && other.categoryId !== categoryId,
      )
    : [];

  const save = async () => {
    setSaving(true);
    const ok = await mutate(async (client, userId) => {
      await updateTransactions(client, userId, [transaction.id], {
        merchant,
        notes,
        ...(categoryChanged ? { categoryId } : {}),
        reviewStatus: categoryId ? "confirmed" : "needs_review",
      });

      if (rememberForMerchant && categoryId && merchantKey) {
        const direction: "in" | "out" = transaction.amountMinor < 0 ? "out" : "in";
        await createRule(client, userId, {
          field: "merchant",
          matchType: "equals",
          pattern: merchant || transaction.merchant || "",
          accountId: null,
          direction,
          categoryId,
          priority: 200,
          source: "correction",
        });

        if (applyToExisting) {
          const rule = { id: "pending", field: "merchant" as const, matchType: "equals" as const, pattern: merchant || transaction.merchant || "", accountId: null, direction, categoryId, priority: 200, isEnabled: true, source: "correction" as const, createdAt: new Date().toISOString() };
          const updates = sameMerchant
            .map((other) => ({ other, result: categorizeTransaction({ merchant: other.merchant, description: other.descriptionOriginal, amountMinor: other.amountMinor, accountId: other.accountId, bank: null }, { rules: [rule], categories: snapshot.categories }) }))
            .filter(({ result }) => result.categoryId === categoryId)
            .map(({ other }) => ({ id: other.id, categoryId, method: "rule_user" as const, ruleId: null }));
          await applyCategorizations(client, userId, updates);
        }
      }
    }, "Transaction saved.");
    setSaving(false);
    if (ok) onClose();
  };

  const account = accountsById.get(transaction.accountId);
  const category = categoryId ? categoriesById.get(categoryId) : null;

  return (
    <Modal title="Edit transaction" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="text-sm text-slate-400">
              {formatDate(transaction.bookedOn)} · {account?.name ?? "Unknown account"} · {transaction.source.toUpperCase()}
            </div>
            <Money minor={transaction.amountMinor} currency={transaction.currency} signed className="text-lg font-black" />
          </div>
          {transaction.originalCurrency && transaction.originalAmountMinor !== null ? (
            <p className="mt-1 text-xs text-slate-500">
              Charged as <Money minor={transaction.originalAmountMinor} currency={transaction.originalCurrency} />
            </p>
          ) : null}
          <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">Original bank description</p>
          <p className="mt-1 break-words text-sm text-slate-200">{transaction.descriptionOriginal}</p>
          {transaction.bankReference ? <p className="mt-2 text-xs text-slate-500">Reference {transaction.bankReference}</p> : null}
        </div>

        <label className="block text-sm text-slate-300">
          Merchant
          <input className={inputClass + " mt-1"} value={merchant} maxLength={200} onChange={(event) => setMerchant(event.target.value)} />
        </label>

        <label className="block text-sm text-slate-300">
          Category
          <div className="mt-1">
            <CategorySelect categories={snapshot.categories} value={categoryId} onChange={setCategoryId} />
          </div>
        </label>

        {categoryChanged && categoryId && merchantKey ? (
          <div className="space-y-2 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 text-sm">
            <label className="flex items-start gap-2 text-slate-200">
              <input type="checkbox" className="mt-1" checked={rememberForMerchant} onChange={(event) => setRememberForMerchant(event.target.checked)} />
              <span>
                Apply to future transactions from <strong>{merchant || transaction.merchant}</strong> ({category?.name})
              </span>
            </label>
            {rememberForMerchant && sameMerchant.length > 0 ? (
              <label className="ml-6 flex items-start gap-2 text-slate-400">
                <input type="checkbox" className="mt-1" checked={applyToExisting} onChange={(event) => setApplyToExisting(event.target.checked)} />
                <span>
                  Also recategorise {sameMerchant.length} existing transaction{sameMerchant.length === 1 ? "" : "s"} from this merchant (lines you set by hand are left alone)
                </span>
              </label>
            ) : null}
          </div>
        ) : null}

        <label className="block text-sm text-slate-300">
          Notes
          <textarea className={inputClass + " mt-1 min-h-[70px]"} value={notes} maxLength={2000} onChange={(event) => setNotes(event.target.value)} />
        </label>

        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className={buttonClass} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} disabled={saving} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
