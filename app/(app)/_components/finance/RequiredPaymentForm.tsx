"use client";

import { useState } from "react";
import { isCurrencyCode, minorToMajorString, parseUserAmount } from "../../_lib/finance/money";
import { createRequiredPayment, deleteRequiredPayment, updateRequiredPayment } from "../../_lib/finance/repository/finance-repository";
import type { RequiredPayment } from "../../_lib/finance/types";
import Modal from "../Modal";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { buttonClass, dangerButtonClass, inputClass, primaryButtonClass } from "./FinanceUi";

// Create or edit a required monthly payment. Only a name and a due day
// are required; the match text is what lets Atlas tick it off by itself
// when an imported statement shows the payment.

export default function RequiredPaymentForm({ payment, onClose }: Readonly<{ payment: RequiredPayment | null; onClose: () => void }>) {
  const snapshot = useFinanceSnapshot();
  const { mutate } = useFinanceData();
  const [name, setName] = useState(payment?.name ?? "");
  const [dueDay, setDueDay] = useState(String(payment?.dueDay ?? 1));
  const [matchPattern, setMatchPattern] = useState(payment?.matchPattern ?? "");
  const [currency, setCurrency] = useState(payment?.currency ?? snapshot.accounts[0]?.currency ?? "EUR");
  const [amount, setAmount] = useState(payment?.expectedAmountMinor && payment.currency ? minorToMajorString(payment.expectedAmountMinor, payment.currency) : "");
  const [tolerance, setTolerance] = useState(String(payment?.amountTolerancePct ?? 5));
  const [accountId, setAccountId] = useState(payment?.accountId ?? "");
  const [isActive, setIsActive] = useState(payment?.isActive ?? true);
  const [saving, setSaving] = useState(false);

  const day = Number(dueDay);
  const expected = amount.trim() ? parseUserAmount(amount, currency) : null;
  const toleranceValue = Number(tolerance);
  const problem = !name.trim()
    ? "Give the payment a name."
    : !Number.isInteger(day) || day < 1 || day > 31
      ? "The due day must be between 1 and 31."
      : amount.trim() && (!expected || expected <= 0 || !isCurrencyCode(currency))
        ? "Enter a valid amount and three-letter currency, or leave the amount empty."
        : !Number.isFinite(toleranceValue) || toleranceValue < 0 || toleranceValue > 100
          ? "Tolerance must be between 0 and 100%."
          : null;

  const save = async () => {
    if (problem) return;
    setSaving(true);
    const input = {
      name,
      dueDay: day,
      matchPattern: matchPattern.trim() || null,
      expectedAmountMinor: expected,
      currency: expected ? currency : null,
      amountTolerancePct: toleranceValue,
      accountId: accountId || null,
      isActive,
    };
    const ok = await mutate((client, userId) => (payment ? updateRequiredPayment(client, userId, payment.id, input) : createRequiredPayment(client, userId, input)), payment ? "Payment updated." : "Payment added.");
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal title={payment ? "Edit payment" : "New required payment"} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Name
          <input className={inputClass + " mt-1"} placeholder="Rent, phone, gym…" value={name} maxLength={80} onChange={(event) => setName(event.target.value)} />
        </label>
        <label className="block text-sm text-slate-300">
          Due on day of month
          <input className={inputClass + " mt-1"} type="number" min={1} max={31} value={dueDay} onChange={(event) => setDueDay(event.target.value)} />
          <span className="mt-1 block text-xs text-slate-500">29–31 fall on the last day of shorter months.</span>
        </label>
        <label className="block text-sm text-slate-300">
          From account (optional)
          <select className={inputClass + " mt-1"} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            <option value="">Any account</option>
            {snapshot.accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Recognise it in statements by
          <input className={inputClass + " mt-1"} placeholder="Text from the bank line, e.g. iliad or the landlord's name" value={matchPattern} maxLength={200} onChange={(event) => setMatchPattern(event.target.value)} />
          <span className="mt-1 block text-xs text-slate-500">Atlas marks the month paid when an outgoing transaction&apos;s merchant or description contains this. Leave empty to tick it off by hand only.</span>
        </label>
        <label className="block text-sm text-slate-300">
          Expected amount (optional)
          <div className="mt-1 flex gap-2">
            <input className={inputClass} inputMode="decimal" placeholder="e.g. 9.99" value={amount} onChange={(event) => setAmount(event.target.value)} />
            <input aria-label="Currency" className={inputClass + " w-20 uppercase"} maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} />
          </div>
        </label>
        <label className="block text-sm text-slate-300">
          Amount tolerance %
          <input className={inputClass + " mt-1"} type="number" min={0} max={100} value={tolerance} disabled={!amount.trim()} onChange={(event) => setTolerance(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 sm:col-span-2">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} /> Active (shown in the sidebar)
        </label>
      </div>
      {problem && name ? <p className="mt-3 text-sm text-amber-300">{problem}</p> : null}
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        {payment ? (
          <button
            type="button"
            className={dangerButtonClass}
            onClick={() => void mutate((client, userId) => deleteRequiredPayment(client, userId, payment.id), "Payment deleted.").then((ok) => ok && onClose())}
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className={buttonClass} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={primaryButtonClass} disabled={saving || problem !== null} onClick={() => void save()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
