"use client";

import { useState } from "react";
import { todayIso } from "../../_lib/finance/dates";
import { transactionFingerprint } from "../../_lib/finance/dedupe";
import { isCurrencyCode, parseUserAmount } from "../../_lib/finance/money";
import { createManualAccount, createManualTransaction } from "../../_lib/finance/repository/finance-repository";
import Modal from "../Modal";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { buttonClass, CategorySelect, inputClass, primaryButtonClass } from "./FinanceUi";

// Add a transaction by hand (cash, an account without statements). A new
// cash-style account can be created inline.

const NEW_ACCOUNT = "__new__";

export default function ManualTransactionModal({ onClose }: Readonly<{ onClose: () => void }>) {
  const snapshot = useFinanceSnapshot();
  const { mutate } = useFinanceData();
  const accounts = snapshot.accounts.filter((account) => !account.isArchived);
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? NEW_ACCOUNT);
  const [newAccountName, setNewAccountName] = useState("Cash");
  const [newAccountCurrency, setNewAccountCurrency] = useState("EUR");
  const [direction, setDirection] = useState<"out" | "in">("out");
  const [amount, setAmount] = useState("");
  const [bookedOn, setBookedOn] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const currency = accountId === NEW_ACCOUNT ? newAccountCurrency.toUpperCase() : (accounts.find((account) => account.id === accountId)?.currency ?? "EUR");
  const minor = parseUserAmount(amount, currency);
  const problems = [
    !minor || minor <= 0 ? "Enter an amount greater than zero." : null,
    !description.trim() ? "Enter a description." : null,
    !/^\d{4}-\d{2}-\d{2}$/.test(bookedOn) ? "Choose a date." : null,
    accountId === NEW_ACCOUNT && (!newAccountName.trim() || !isCurrencyCode(currency)) ? "Name the new account and give a three-letter currency." : null,
  ].filter(Boolean);

  const save = async () => {
    if (problems.length > 0 || !minor) return;
    setSaving(true);
    const signed = direction === "out" ? -minor : minor;
    const ok = await mutate(async (client, userId) => {
      const targetAccountId = accountId === NEW_ACCOUNT ? await createManualAccount(client, userId, { name: newAccountName, currency }) : accountId;
      await createManualTransaction(client, userId, {
        accountId: targetAccountId,
        bookedOn,
        description,
        merchant: merchant || null,
        amountMinor: signed,
        currency,
        categoryId,
        fingerprint: transactionFingerprint({ bookedOn, amountMinor: signed, currency, description, reference: null }),
      });
    }, "Transaction added.");
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal title="Add transaction" onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Account
          <select className={inputClass + " mt-1"} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} ({account.currency})
              </option>
            ))}
            <option value={NEW_ACCOUNT}>New account…</option>
          </select>
        </label>
        {accountId === NEW_ACCOUNT ? (
          <>
            <label className="block text-sm text-slate-300">
              Account name
              <input className={inputClass + " mt-1"} value={newAccountName} maxLength={120} onChange={(event) => setNewAccountName(event.target.value)} />
            </label>
            <label className="block text-sm text-slate-300">
              Currency
              <input className={inputClass + " mt-1 uppercase"} value={newAccountCurrency} maxLength={3} onChange={(event) => setNewAccountCurrency(event.target.value.toUpperCase())} />
            </label>
          </>
        ) : null}
        <div className="text-sm text-slate-300">
          Direction
          <div className="mt-1 grid grid-cols-2 gap-2">
            {(["out", "in"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDirection(value)}
                className={"rounded-xl border px-3 py-2 " + (direction === value ? "border-purple-400/60 bg-purple-500/15 text-white" : "border-slate-700 text-slate-400")}
              >
                {value === "out" ? "Money out" : "Money in"}
              </button>
            ))}
          </div>
        </div>
        <label className="block text-sm text-slate-300">
          Amount ({currency})
          <input className={inputClass + " mt-1"} inputMode="decimal" placeholder="12.50" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </label>
        <label className="block text-sm text-slate-300">
          Date
          <input type="date" className={inputClass + " mt-1"} value={bookedOn} onChange={(event) => setBookedOn(event.target.value)} />
        </label>
        <label className="block text-sm text-slate-300">
          Merchant (optional)
          <input className={inputClass + " mt-1"} value={merchant} maxLength={200} onChange={(event) => setMerchant(event.target.value)} />
        </label>
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Description
          <input className={inputClass + " mt-1"} value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <label className="block text-sm text-slate-300 sm:col-span-2">
          Category
          <div className="mt-1">
            <CategorySelect categories={snapshot.categories} value={categoryId} onChange={setCategoryId} />
          </div>
        </label>
      </div>
      {problems.length > 0 && amount ? <p className="mt-3 text-sm text-amber-300">{problems[0]}</p> : null}
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className={buttonClass} onClick={onClose}>
          Cancel
        </button>
        <button type="button" className={primaryButtonClass} disabled={saving || problems.length > 0} onClick={() => void save()}>
          {saving ? "Saving…" : "Add transaction"}
        </button>
      </div>
    </Modal>
  );
}
