"use client";

import { useMemo, useState } from "react";
import { classifyTransaction } from "../../_lib/finance/analytics";
import { exportTransactionsCsv } from "../../_lib/finance/csv-export";
import { deleteTransactions, updateTransactions } from "../../_lib/finance/repository/finance-repository";
import { todayIso } from "../../_lib/finance/dates";
import type { FinanceTransaction } from "../../_lib/finance/types";
import Card from "../Card";
import Modal from "../Modal";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { FLOW_LABELS } from "./FinanceFilterBar";
import { Badge, buttonClass, CategoryDot, CategorySelect, dangerButtonClass, downloadTextFile, EmptyState, formatDate, Money, primaryButtonClass } from "./FinanceUi";
import ManualTransactionModal from "./ManualTransactionModal";
import TransactionEditor from "./TransactionEditor";

type SortKey = "date" | "amount" | "merchant";

const PAGE_SIZE = 50;

const METHOD_LABELS: Readonly<Record<FinanceTransaction["categorizationMethod"], string>> = {
  rule_user: "Your rule",
  rule_builtin: "Built-in rule",
  manual: "Manual",
  none: "—",
};

export default function TransactionsTab({ transactions, filterBar }: Readonly<{ transactions: ReadonlyArray<FinanceTransaction>; filterBar: React.ReactNode }>) {
  const snapshot = useFinanceSnapshot();
  const { context, accountsById, categoriesById, mutate } = useFinanceData();
  const [sort, setSort] = useState<{ key: SortKey; descending: boolean }>({ key: "date", descending: true });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [bulkCategory, setBulkCategory] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const direction = sort.descending ? -1 : 1;
    return [...transactions].sort((first, second) => {
      if (sort.key === "amount") return direction * (first.amountMinor - second.amountMinor);
      if (sort.key === "merchant") return direction * (first.merchant ?? first.descriptionOriginal).localeCompare(second.merchant ?? second.descriptionOriginal);
      return direction * (first.bookedOn.localeCompare(second.bookedOn) || first.createdAt.localeCompare(second.createdAt));
    });
  }, [sort, transactions]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = sorted.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);
  const selectedIds = [...selected].filter((id) => transactions.some((transaction) => transaction.id === id));
  const allVisibleSelected = visible.length > 0 && visible.every((transaction) => selected.has(transaction.id));

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleVisible = () =>
    setSelected((current) => {
      const next = new Set(current);
      for (const transaction of visible) {
        if (allVisibleSelected) next.delete(transaction.id);
        else next.add(transaction.id);
      }
      return next;
    });

  const sortButton = (key: SortKey, label: string) => (
    <button type="button" className="font-semibold hover:text-white" onClick={() => setSort((current) => ({ key, descending: current.key === key ? !current.descending : key !== "merchant" }))}>
      {label}
      {sort.key === key ? (sort.descending ? " ↓" : " ↑") : ""}
    </button>
  );

  const bulkCategorise = () =>
    void mutate(
      (client, userId) => updateTransactions(client, userId, selectedIds, { categoryId: bulkCategory, reviewStatus: bulkCategory ? "confirmed" : "needs_review" }),
      `${selectedIds.length} transaction${selectedIds.length === 1 ? "" : "s"} recategorised.`,
    ).then((ok) => ok && setSelected(new Set()));

  const bulkConfirm = () =>
    void mutate((client, userId) => updateTransactions(client, userId, selectedIds, { reviewStatus: "confirmed" }), "Marked as reviewed.").then((ok) => ok && setSelected(new Set()));

  const removeSelected = () =>
    void mutate((client, userId) => deleteTransactions(client, userId, selectedIds), `${selectedIds.length} transaction${selectedIds.length === 1 ? "" : "s"} deleted.`).then((ok) => {
      setConfirmDelete(false);
      if (ok) setSelected(new Set());
    });

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        {filterBar}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-400">
            {transactions.length.toLocaleString("en-GB")} transaction{transactions.length === 1 ? "" : "s"}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={buttonClass} disabled={transactions.length === 0} onClick={() => downloadTextFile(`atlas-transactions-${todayIso()}.csv`, exportTransactionsCsv(sorted, snapshot.accounts, context))}>
              Export CSV
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => setAdding(true)}>
              Add transaction
            </button>
          </div>
        </div>
        {selectedIds.length > 0 ? (
          <div className="flex flex-col gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 sm:flex-row sm:flex-wrap sm:items-center">
            <span className="text-sm text-white">{selectedIds.length} selected</span>
            <div className="sm:w-60">
              <CategorySelect categories={snapshot.categories} value={bulkCategory} onChange={setBulkCategory} ariaLabel="Category for selected" />
            </div>
            <button type="button" className={buttonClass} onClick={bulkCategorise}>
              Set category
            </button>
            <button type="button" className={buttonClass} onClick={bulkConfirm}>
              Mark reviewed
            </button>
            <button type="button" className={dangerButtonClass} onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
            <button type="button" className="text-sm text-slate-400 hover:text-white" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden p-0">
        {visible.length === 0 ? (
          <div className="p-5">
            <EmptyState text="No transactions match these filters." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="w-10 px-3 py-3">
                    <input type="checkbox" aria-label="Select all on this page" checked={allVisibleSelected} onChange={toggleVisible} />
                  </th>
                  <th className="px-2 py-3">{sortButton("date", "Date")}</th>
                  <th className="px-2 py-3">{sortButton("merchant", "Merchant")}</th>
                  <th className="px-2 py-3 text-right">{sortButton("amount", "Amount")}</th>
                  <th className="px-2 py-3 font-semibold">Account</th>
                  <th className="px-2 py-3 font-semibold">Category</th>
                  <th className="px-2 py-3 font-semibold">Type</th>
                  <th className="px-2 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((transaction) => {
                  const category = transaction.categoryId ? categoriesById.get(transaction.categoryId) : null;
                  return (
                    <tr key={transaction.id} className="cursor-pointer border-b border-slate-800/70 align-top transition hover:bg-white/[0.03]" onClick={() => setEditing(transaction)}>
                      <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                        <input type="checkbox" aria-label="Select transaction" checked={selected.has(transaction.id)} onChange={() => toggle(transaction.id)} />
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-slate-300">{formatDate(transaction.bookedOn)}</td>
                      <td className="max-w-[320px] px-2 py-3">
                        <p className="truncate font-medium text-slate-100">{transaction.merchant ?? "—"}</p>
                        <p className="truncate text-xs text-slate-500" title={transaction.descriptionOriginal}>
                          {transaction.descriptionOriginal}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-600">
                          {transaction.source.toUpperCase()} · {METHOD_LABELS[transaction.categorizationMethod]}
                          {transaction.bankReference ? ` · Ref ${transaction.bankReference}` : ""} · added {transaction.createdAt.slice(0, 10)}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">
                        <Money minor={transaction.amountMinor} currency={transaction.currency} signed className="font-semibold" />
                        {transaction.originalCurrency && transaction.originalAmountMinor !== null ? (
                          <p className="text-[11px] text-slate-500">
                            <Money minor={transaction.originalAmountMinor} currency={transaction.originalCurrency} />
                          </p>
                        ) : null}
                      </td>
                      <td className="px-2 py-3 text-slate-400">{accountsById.get(transaction.accountId)?.name ?? "—"}</td>
                      <td className="px-2 py-3">
                        <span className="flex items-center gap-2 text-slate-300">
                          <CategoryDot category={category} /> {category?.name ?? "Needs review"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-slate-400">{FLOW_LABELS[classifyTransaction(transaction, context)]}</td>
                      <td className="px-2 py-3">
                        {transaction.reviewStatus === "needs_review" ? <Badge tone="amber">Review</Badge> : <Badge tone="emerald">OK</Badge>}
                        {transaction.possibleDuplicateOf ? (
                          <span className="ml-1">
                            <Badge tone="rose">Duplicate?</Badge>
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pageCount > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-4 py-3 text-sm text-slate-400">
            <button type="button" className={buttonClass} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>
              Previous
            </button>
            <span>
              Page {currentPage + 1} of {pageCount}
            </span>
            <button type="button" className={buttonClass} disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)}>
              Next
            </button>
          </div>
        ) : null}
      </Card>

      {editing ? <TransactionEditor transaction={editing} onClose={() => setEditing(null)} /> : null}
      {adding ? <ManualTransactionModal onClose={() => setAdding(false)} /> : null}
      {confirmDelete ? (
        <Modal title="Delete transactions" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-slate-300">
            Delete {selectedIds.length} transaction{selectedIds.length === 1 ? "" : "s"}? This cannot be undone. Imported lines come back only by deleting and re-importing their statement.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" className={buttonClass} onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
            <button type="button" className={dangerButtonClass} onClick={removeSelected}>
              Delete
            </button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
