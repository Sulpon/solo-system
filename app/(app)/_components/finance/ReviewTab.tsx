"use client";

import { useMemo, useState } from "react";
import { minorToMajorString } from "../../_lib/finance/money";
import { createTransferLink, deleteTransactions, deleteTransferLink, updateTransactions } from "../../_lib/finance/repository/finance-repository";
import { suggestTransferPairs, validateTransferLink, type LinkKind } from "../../_lib/finance/transfers";
import type { FinanceTransaction } from "../../_lib/finance/types";
import Card from "../Card";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { Badge, buttonClass, CategorySelect, dangerButtonClass, EmptyState, formatDate, inputClass, Money, primaryButtonClass, SectionHeading } from "./FinanceUi";

// Everything that needs a human decision, in one place: uncategorised
// lines, possible duplicates, statements that did not reconcile, and
// money that may have moved between the user's own accounts.

const REVIEW_LIMIT = 60;

function TransactionLine({ transaction, accountName }: Readonly<{ transaction: FinanceTransaction; accountName: string }>) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-slate-100">{transaction.merchant ?? transaction.descriptionOriginal}</p>
      <p className="truncate text-xs text-slate-500" title={transaction.descriptionOriginal}>
        {formatDate(transaction.bookedOn)} · {accountName} · {transaction.descriptionOriginal}
      </p>
    </div>
  );
}

export default function ReviewTab() {
  const snapshot = useFinanceSnapshot();
  const { mutate, accountsById, showNotice } = useFinanceData();
  const accountName = (id: string) => accountsById.get(id)?.name ?? "Unknown account";
  const byId = useMemo(() => new Map(snapshot.transactions.map((transaction) => [transaction.id, transaction])), [snapshot.transactions]);

  const needsReview = snapshot.transactions.filter((transaction) => transaction.reviewStatus === "needs_review" && !transaction.possibleDuplicateOf);
  const duplicates = snapshot.transactions.filter((transaction) => transaction.possibleDuplicateOf);
  const mismatched = snapshot.statements.filter((statement) => statement.reconciliationStatus === "mismatch");
  const suggestions = useMemo(() => suggestTransferPairs(snapshot.transactions, snapshot.links, snapshot.categories), [snapshot]);

  const [manualOut, setManualOut] = useState("");
  const [manualIn, setManualIn] = useState("");
  const linked = new Set(snapshot.links.flatMap((link) => [link.outgoingTransactionId, link.incomingTransactionId]));
  const unlinkedOut = snapshot.transactions.filter((transaction) => transaction.amountMinor < 0 && !linked.has(transaction.id)).slice(0, 300);
  const unlinkedIn = snapshot.transactions.filter((transaction) => transaction.amountMinor > 0 && !linked.has(transaction.id)).slice(0, 300);

  const link = (outgoing: FinanceTransaction, incoming: FinanceTransaction, kind: LinkKind) => {
    const problem = validateTransferLink(outgoing, incoming, kind);
    if (problem) {
      showNotice({ kind: "error", text: problem });
      return;
    }
    void mutate((client, userId) => createTransferLink(client, userId, outgoing.id, incoming.id, kind), "Linked: this money is no longer counted as income or spending.").then((ok) => {
      if (ok) {
        setManualOut("");
        setManualIn("");
      }
    });
  };

  const manualOutgoing = manualOut ? byId.get(manualOut) : undefined;
  const manualIncoming = manualIn ? byId.get(manualIn) : undefined;
  const optionLabel = (transaction: FinanceTransaction) =>
    `${transaction.bookedOn} · ${(transaction.merchant ?? transaction.descriptionOriginal).slice(0, 40)} · ${minorToMajorString(transaction.amountMinor, transaction.currency)} ${transaction.currency} · ${accountName(transaction.accountId)}`;

  return (
    <div className="space-y-5">
      {mismatched.length > 0 ? (
        <Card className="p-5">
          <SectionHeading title="Statements that did not reconcile" detail="Opening balance plus the imported lines does not reach the statement's closing balance. Nothing was adjusted: check the statement for missing or misread lines." />
          <ul className="mt-4 space-y-2">
            {mismatched.map((statement) => (
              <li key={statement.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm">
                <span className="text-slate-200">
                  {accountName(statement.accountId)} · {statement.periodStart ? formatDate(statement.periodStart) : "?"} – {statement.periodEnd ? formatDate(statement.periodEnd) : "?"}
                </span>
                <span className="text-rose-200">
                  Difference <Money minor={statement.reconciliationDifferenceMinor ?? 0} currency={statement.currency} signed />
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="p-5">
        <SectionHeading
          title="Needs review"
          detail="No rule could categorise these. Choosing a category confirms the line."
          action={
            needsReview.some((transaction) => transaction.categoryId) ? (
              <button
                type="button"
                className={buttonClass}
                onClick={() =>
                  void mutate(
                    (client, userId) => updateTransactions(client, userId, needsReview.filter((transaction) => transaction.categoryId).map((transaction) => transaction.id), { reviewStatus: "confirmed" }),
                    "Categorised lines confirmed.",
                  )
                }
              >
                Confirm all categorised
              </button>
            ) : null
          }
        />
        <div className="mt-4">
          {needsReview.length === 0 ? (
            <EmptyState text="Nothing to review." />
          ) : (
            <ul className="divide-y divide-slate-800">
              {needsReview.slice(0, REVIEW_LIMIT).map((transaction) => (
                <li key={transaction.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <TransactionLine transaction={transaction} accountName={accountName(transaction.accountId)} />
                  <div className="flex shrink-0 items-center gap-2">
                    <Money minor={transaction.amountMinor} currency={transaction.currency} signed className="w-28 text-right text-sm font-semibold" />
                    <CategorySelect
                      categories={snapshot.categories}
                      value={transaction.categoryId}
                      className={inputClass + " sm:w-52"}
                      onChange={(categoryId) => void mutate((client, userId) => updateTransactions(client, userId, [transaction.id], { categoryId, reviewStatus: categoryId ? "confirmed" : "needs_review" }))}
                    />
                    <button
                      type="button"
                      className={buttonClass}
                      title="Keep it as it is"
                      onClick={() => void mutate((client, userId) => updateTransactions(client, userId, [transaction.id], { reviewStatus: "confirmed" }))}
                    >
                      OK
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {needsReview.length > REVIEW_LIMIT ? <p className="mt-3 text-xs text-slate-500">Showing {REVIEW_LIMIT} of {needsReview.length}. Bulk tools are in Transactions (filter by Needs review).</p> : null}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeading title="Possible duplicates" detail="Same account, amount and day as a line already stored, but worded differently. Atlas never deletes these by itself." />
        <div className="mt-4">
          {duplicates.length === 0 ? (
            <EmptyState text="No possible duplicates." />
          ) : (
            <ul className="space-y-3">
              {duplicates.map((transaction) => {
                const original = transaction.possibleDuplicateOf ? byId.get(transaction.possibleDuplicateOf) : undefined;
                return (
                  <li key={transaction.id} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <Badge tone="amber">New</Badge>
                        <TransactionLine transaction={transaction} accountName={accountName(transaction.accountId)} />
                        <Money minor={transaction.amountMinor} currency={transaction.currency} signed className="text-sm" />
                      </div>
                      {original ? (
                        <div>
                          <Badge>Already stored</Badge>
                          <TransactionLine transaction={original} accountName={accountName(original.accountId)} />
                          <Money minor={original.amountMinor} currency={original.currency} signed className="text-sm" />
                        </div>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className={buttonClass}
                        onClick={() => void mutate((client, userId) => updateTransactions(client, userId, [transaction.id], { clearPossibleDuplicate: true, reviewStatus: transaction.categoryId ? "confirmed" : "needs_review" }), "Kept both.")}
                      >
                        Keep both
                      </button>
                      <button type="button" className={dangerButtonClass} onClick={() => void mutate((client, userId) => deleteTransactions(client, userId, [transaction.id]), "Duplicate removed.")}>
                        Delete the new one
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeading title="Transfers between your accounts" detail="Linked pairs are neither income nor spending. Suggestions need one side already marked as a transfer; you confirm every link." />
        <div className="mt-4 space-y-3">
          {suggestions.map((suggestion) => (
            <div key={suggestion.outgoing.id + suggestion.incoming.id} className="flex flex-col gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                <TransactionLine transaction={suggestion.outgoing} accountName={accountName(suggestion.outgoing.accountId)} />
                <TransactionLine transaction={suggestion.incoming} accountName={accountName(suggestion.incoming.accountId)} />
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Money minor={suggestion.incoming.amountMinor} currency={suggestion.incoming.currency} className="text-sm" />
                <button type="button" className={primaryButtonClass} onClick={() => link(suggestion.outgoing, suggestion.incoming, suggestion.kind)}>
                  Link {suggestion.kind}
                </button>
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-slate-800 p-3">
            <p className="text-sm font-semibold text-slate-200">Link manually</p>
            <div className="mt-2 grid gap-2 lg:grid-cols-[1fr_1fr_auto]">
              <select aria-label="Money out" className={inputClass} value={manualOut} onChange={(event) => setManualOut(event.target.value)}>
                <option value="">Money out of…</option>
                {unlinkedOut.map((transaction) => (
                  <option key={transaction.id} value={transaction.id}>
                    {optionLabel(transaction)}
                  </option>
                ))}
              </select>
              <select aria-label="Money in" className={inputClass} value={manualIn} onChange={(event) => setManualIn(event.target.value)}>
                <option value="">Money into…</option>
                {unlinkedIn.map((transaction) => (
                  <option key={transaction.id} value={transaction.id}>
                    {optionLabel(transaction)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={primaryButtonClass}
                disabled={!manualOutgoing || !manualIncoming}
                onClick={() => manualOutgoing && manualIncoming && link(manualOutgoing, manualIncoming, manualOutgoing.currency === manualIncoming.currency ? "transfer" : "exchange")}
              >
                Link
              </button>
            </div>
          </div>

          {snapshot.links.length > 0 ? (
            <ul className="divide-y divide-slate-800">
              {snapshot.links.map((pair) => {
                const outgoing = byId.get(pair.outgoingTransactionId);
                const incoming = byId.get(pair.incomingTransactionId);
                if (!outgoing || !incoming) return null;
                return (
                  <li key={pair.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
                      <TransactionLine transaction={outgoing} accountName={accountName(outgoing.accountId)} />
                      <TransactionLine transaction={incoming} accountName={accountName(incoming.accountId)} />
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone="cyan">{pair.kind}</Badge>
                      <button type="button" className={buttonClass} onClick={() => void mutate((client, userId) => deleteTransferLink(client, userId, pair.id), "Unlinked.")}>
                        Unlink
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
