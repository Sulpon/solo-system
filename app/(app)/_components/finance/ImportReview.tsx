"use client";

import { useMemo, useState } from "react";
import { commitImport, deleteImport } from "../../_lib/finance/api-client";
import type { CommitDecisions, ImportPreview, PreviewSection } from "../../_lib/finance/import-preview";
import Modal from "../Modal";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { Badge, buttonClass, CategorySelect, dangerButtonClass, formatDate, inputClass, Money, primaryButtonClass } from "./FinanceUi";

// The last stop before anything is saved: every extracted line, its
// suggested category and duplicate status, each section's reconciliation
// and the account it will land in. Nothing is committed automatically.

type LineDecision = { include: boolean; categoryId: string | null };
type SectionDecision = { accountId: string | null; accountName: string };

const RECONCILIATION_TEXT = {
  balanced: "Balances reconcile to the cent.",
  mismatch: "Balances do NOT reconcile.",
  unverifiable: "This file has no opening/closing balance to check against.",
} as const;

function SectionCard({
  section,
  decision,
  onDecision,
  lines,
  onLine,
}: Readonly<{
  section: PreviewSection;
  decision: SectionDecision;
  onDecision: (next: SectionDecision) => void;
  lines: ReadonlyMap<string, LineDecision>;
  onLine: (key: string, next: LineDecision) => void;
}>) {
  const snapshot = useFinanceSnapshot();
  const sameCurrency = snapshot.accounts.filter((account) => account.currency === section.account.currency && !account.isArchived);
  const matched = section.matchedAccountId ? snapshot.accounts.find((account) => account.id === section.matchedAccountId) : undefined;
  const { reconciliation, balances, account } = section;
  const tone = reconciliation.status === "balanced" ? "emerald" : reconciliation.status === "mismatch" ? "rose" : "amber";

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">
            {account.bankName} · {account.currency}
            {account.product !== "current" ? ` · ${account.product}` : ""} {account.accountIdentifier ? <span className="text-slate-500">{account.accountIdentifier}</span> : null}
          </p>
          <p className="text-xs text-slate-500">
            {balances.periodStart ? formatDate(balances.periodStart) : "?"} – {balances.periodEnd ? formatDate(balances.periodEnd) : "?"} · {section.transactions.length} line{section.transactions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Badge tone={tone}>{RECONCILIATION_TEXT[reconciliation.status]}</Badge>
      </div>

      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
        <p className="text-slate-400">
          Opening <span className="block text-slate-100">{balances.openingBalanceMinor === null ? "—" : <Money minor={balances.openingBalanceMinor} currency={account.currency} />}</span>
        </p>
        <p className="text-slate-400">
          In / out{" "}
          <span className="block text-slate-100">
            <Money minor={reconciliation.creditsMinor} currency={account.currency} /> / <Money minor={reconciliation.debitsMinor} currency={account.currency} />
          </span>
        </p>
        <p className="text-slate-400">
          Closing <span className="block text-slate-100">{balances.closingBalanceMinor === null ? "—" : <Money minor={balances.closingBalanceMinor} currency={account.currency} />}</span>
        </p>
        {reconciliation.status === "mismatch" && reconciliation.differenceMinor !== null ? (
          <p className="text-rose-300">
            Difference <span className="block font-semibold"><Money minor={reconciliation.differenceMinor} currency={account.currency} signed /></span>
          </p>
        ) : null}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          Import into
          <select
            className={inputClass + " mt-1"}
            value={decision.accountId ?? ""}
            onChange={(event) => onDecision({ ...decision, accountId: event.target.value || null })}
          >
            <option value="">{matched ? `${matched.name} (matched)` : "A new account"}</option>
            {sameCurrency
              .filter((candidate) => candidate.id !== matched?.id)
              .map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
          </select>
        </label>
        {!decision.accountId && !matched ? (
          <label className="text-sm text-slate-300">
            New account name
            <input className={inputClass + " mt-1"} value={decision.accountName} maxLength={120} onChange={(event) => onDecision({ ...decision, accountName: event.target.value })} />
          </label>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="w-10 py-2">Add</th>
              <th className="py-2">Date</th>
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Amount</th>
              <th className="py-2 pl-3">Category</th>
            </tr>
          </thead>
          <tbody>
            {section.transactions.map((transaction) => {
              const line = lines.get(transaction.key) ?? { include: true, categoryId: transaction.suggestion.categoryId };
              const exact = transaction.duplicate.status === "exact";
              return (
                <tr key={transaction.key} className={"border-t border-slate-800 align-top " + (exact || !line.include ? "opacity-50" : "")}>
                  <td className="py-2">
                    <input type="checkbox" aria-label="Include this line" disabled={exact} checked={!exact && line.include} onChange={(event) => onLine(transaction.key, { ...line, include: event.target.checked })} />
                  </td>
                  <td className="whitespace-nowrap py-2 pr-2 text-slate-300">{formatDate(transaction.bookedOn)}</td>
                  <td className="max-w-[340px] py-2 pr-2">
                    <p className="truncate text-slate-100">{transaction.merchant ?? "—"}</p>
                    <p className="truncate text-xs text-slate-500" title={transaction.description}>
                      {transaction.description}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {exact ? <Badge>Already imported</Badge> : null}
                      {transaction.duplicate.status === "possible" ? <Badge tone="amber">Possible duplicate</Badge> : null}
                      {transaction.issues.map((issue) => (
                        <Badge key={issue} tone="rose">
                          {issue}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-2 text-right">
                    <Money minor={transaction.amountMinor} currency={transaction.currency} signed className="font-semibold" />
                    {transaction.originalCurrency && transaction.originalAmountMinor !== null ? (
                      <p className="text-[11px] text-slate-500">
                        <Money minor={transaction.originalAmountMinor} currency={transaction.originalCurrency} />
                      </p>
                    ) : null}
                  </td>
                  <td className="py-2 pl-3">
                    <CategorySelect categories={snapshot.categories} value={line.categoryId} className={inputClass + " min-w-[180px] py-1.5"} onChange={(categoryId) => onLine(transaction.key, { ...line, categoryId })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ImportReview({ importId, fileName, preview, onClose }: Readonly<{ importId: string; fileName: string; preview: ImportPreview; onClose: () => void }>) {
  const { reload, showNotice } = useFinanceData();
  const [sections, setSections] = useState<ReadonlyMap<number, SectionDecision>>(
    () => new Map(preview.sections.map((section) => [section.index, { accountId: null, accountName: section.account.suggestedName }])),
  );
  const [lines, setLines] = useState<ReadonlyMap<string, LineDecision>>(
    () => new Map(preview.sections.flatMap((section) => section.transactions.map((transaction) => [transaction.key, { include: true, categoryId: transaction.suggestion.categoryId }] as const))),
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [busy, setBusy] = useState<"commit" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    let add = 0;
    let existing = 0;
    let excluded = 0;
    for (const section of preview.sections) {
      for (const transaction of section.transactions) {
        if (transaction.duplicate.status === "exact") existing += 1;
        else if (lines.get(transaction.key)?.include === false) excluded += 1;
        else add += 1;
      }
    }
    return { add, existing, excluded };
  }, [lines, preview.sections]);

  const hasMismatch = preview.sections.some((section) => section.reconciliation.status === "mismatch");
  const visibleIssues = preview.issues.filter((issue) => issue.code !== "balance_mismatch");

  const commit = async () => {
    setBusy("commit");
    setError(null);
    const decisions: CommitDecisions = {
      sections: preview.sections.map((section) => ({ index: section.index, ...(sections.get(section.index) as SectionDecision) })),
      transactions: [...lines.entries()].map(([key, line]) => ({ key, include: line.include, categoryId: line.categoryId })),
    };
    const result = await commitImport(importId, decisions);
    setBusy(null);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    showNotice({
      kind: "success",
      text: `Imported ${result.value.inserted} transaction${result.value.inserted === 1 ? "" : "s"}${result.value.skipped ? `, ${result.value.skipped} skipped (already imported or excluded)` : ""}.`,
    });
    await reload();
    onClose();
  };

  const cancel = async () => {
    setBusy("cancel");
    const result = await deleteImport(importId);
    setBusy(null);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    showNotice({ kind: "success", text: "Import cancelled. Nothing was saved." });
    await reload();
    onClose();
  };

  return (
    <Modal title="Review import" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-300">
            <span className="font-semibold text-white">{preview.bankName}</span> · {fileName}
          </p>
          <p className="text-sm text-slate-400">
            {counts.add} to add · {counts.existing} already imported · {counts.excluded} excluded
          </p>
        </div>

        {visibleIssues.length > 0 ? (
          <ul className="space-y-1 rounded-xl border border-slate-800 p-3 text-sm">
            {visibleIssues.map((issue, index) => (
              <li key={index} className={issue.severity === "info" ? "text-slate-400" : "text-amber-200"}>
                {issue.message}
              </li>
            ))}
          </ul>
        ) : null}

        {preview.sections.map((section) => (
          <SectionCard
            key={section.index}
            section={section}
            decision={sections.get(section.index) as SectionDecision}
            onDecision={(next) => setSections((current) => new Map(current).set(section.index, next))}
            lines={lines}
            onLine={(key, next) => setLines((current) => new Map(current).set(key, next))}
          />
        ))}

        {hasMismatch ? (
          <label className="flex items-start gap-2 rounded-xl border border-rose-500/40 bg-rose-500/5 p-3 text-sm text-rose-100">
            <input type="checkbox" className="mt-1" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
            <span>The extracted lines do not add up to this statement&apos;s closing balance. I have checked the lines above and want to import them anyway. The statement will stay flagged for review.</span>
          </label>
        ) : null}

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-wrap justify-end gap-2 border-t border-slate-800 bg-slate-950 px-5 py-4">
          <button type="button" className={dangerButtonClass} disabled={busy !== null} onClick={() => void cancel()}>
            {busy === "cancel" ? "Cancelling…" : "Cancel import"}
          </button>
          <button type="button" className={buttonClass} disabled={busy !== null} onClick={onClose}>
            Decide later
          </button>
          <button type="button" className={primaryButtonClass} disabled={busy !== null || counts.add === 0 || (hasMismatch && !acknowledged)} onClick={() => void commit()}>
            {busy === "commit" ? "Importing…" : `Import ${counts.add} transaction${counts.add === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}
