"use client";

import { useState } from "react";
import { monthKeyOf, shiftMonth, startOfMonth, todayIso } from "../../_lib/finance/dates";
import { resolveAllRequiredPayments, type PaymentUrgency, type RequiredPaymentStatus } from "../../_lib/finance/required-payments";
import { setRequiredPaymentCheck } from "../../_lib/finance/repository/finance-repository";
import type { RequiredPayment } from "../../_lib/finance/types";
import Card from "../Card";
import { useFinanceData, useFinanceSnapshot } from "./FinanceDataProvider";
import { formatDate, Money } from "./FinanceUi";
import RequiredPaymentForm from "./RequiredPaymentForm";

// The right-hand rail: one small widget per required payment, showing the
// deadline and whether this month is paid. Atlas ticks a payment off by
// itself when an imported statement contains it; the checkbox is the
// manual override in both directions.

const URGENCY_STYLE: Readonly<Record<PaymentUrgency, { label: (status: RequiredPaymentStatus) => string; className: string }>> = {
  paid: { label: (status) => (status.source === "statement" ? "Paid · seen in statement" : "Paid · checked by you"), className: "border-emerald-500/40 text-emerald-200" },
  overdue: { label: (status) => `Overdue by ${-status.daysUntilDue} day${status.daysUntilDue === -1 ? "" : "s"}`, className: "border-rose-500/50 text-rose-200" },
  "due-today": { label: () => "Due today", className: "border-amber-500/50 text-amber-200" },
  "due-soon": { label: (status) => `Due in ${status.daysUntilDue} day${status.daysUntilDue === 1 ? "" : "s"}`, className: "border-amber-500/40 text-amber-200" },
  upcoming: { label: (status) => `Due in ${status.daysUntilDue} days`, className: "border-slate-700 text-slate-400" },
};

function monthTitle(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

function PaymentWidget({ status, onEdit }: Readonly<{ status: RequiredPaymentStatus; onEdit: () => void }>) {
  const { mutate } = useFinanceData();
  const periodMonth = startOfMonth(status.month);
  const style = URGENCY_STYLE[status.urgency];
  const isPastMonth = status.urgency !== "paid" && status.daysUntilDue < 0;

  // Unticking: if a statement line would still mark it paid, record a
  // manual "not paid" (the match was wrong); otherwise just drop the tick.
  // Ticking: if the user earlier rejected a match, drop that rejection (the
  // match counts again); otherwise record a manual "paid".
  const toggle = () => {
    const next = status.isPaid ? (status.matchedTransaction ? "unpaid" : null) : status.rejectedMatch ? null : "paid";
    void mutate((client, userId) => setRequiredPaymentCheck(client, userId, status.payment.id, periodMonth, next));
  };

  return (
    <li className={"rounded-xl border bg-slate-950/50 p-3 transition " + (status.isPaid ? "border-emerald-500/20" : isPastMonth ? "border-rose-500/30" : "border-slate-800")}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          aria-label={`${status.payment.name} paid in ${monthTitle(status.month)}`}
          className="mt-1 h-4 w-4 shrink-0 accent-emerald-500"
          checked={status.isPaid}
          onChange={toggle}
        />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={onEdit} className="block max-w-full truncate text-left text-sm font-semibold text-white hover:underline">
            {status.payment.name}
          </button>
          <p className="text-xs text-slate-500">
            Due {formatDate(status.dueDate)}
            {status.payment.expectedAmountMinor !== null && status.payment.currency ? (
              <>
                {" · "}
                <Money minor={status.payment.expectedAmountMinor} currency={status.payment.currency} />
              </>
            ) : null}
          </p>
          <span className={"mt-2 inline-block rounded-full border px-2 py-0.5 text-[11px] font-semibold " + style.className}>{style.label(status)}</span>
          {status.matchedTransaction ? (
            <p className="mt-1 truncate text-[11px] text-slate-500" title={status.matchedTransaction.descriptionOriginal}>
              {formatDate(status.matchedTransaction.bookedOn)} · <Money minor={status.matchedTransaction.amountMinor} currency={status.matchedTransaction.currency} />
            </p>
          ) : null}
          {status.rejectedMatch ? (
            <button
              type="button"
              className="mt-1 text-[11px] text-slate-500 underline-offset-2 hover:text-white hover:underline"
              onClick={() => void mutate((client, userId) => setRequiredPaymentCheck(client, userId, status.payment.id, periodMonth, null))}
            >
              You marked a matching line as not this payment · undo
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
}

export default function RequiredPaymentsRail() {
  const snapshot = useFinanceSnapshot();
  const today = todayIso();
  const [month, setMonth] = useState(monthKeyOf(today));
  const [editing, setEditing] = useState<RequiredPayment | "new" | null>(null);
  const statuses = resolveAllRequiredPayments(snapshot.requiredPayments, month, snapshot.transactions, snapshot.requiredPaymentChecks, today);
  const paid = statuses.filter((status) => status.isPaid).length;
  const inactive = snapshot.requiredPayments.filter((payment) => !payment.isActive);

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">Required payments</p>
          <p className="text-sm text-slate-300">
            {statuses.length > 0 ? `${paid} of ${statuses.length} paid` : "None yet"}
          </p>
        </div>
        <button type="button" className="rounded-lg border border-slate-700 px-2.5 py-1 text-sm text-slate-300 hover:border-purple-400/60 hover:text-white" onClick={() => setEditing("new")} aria-label="Add required payment">
          + Add
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
        <button type="button" className="rounded px-2 py-1 hover:bg-white/5 hover:text-white" onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <span className="font-semibold text-slate-200">{monthTitle(month)}</span>
        <button type="button" className="rounded px-2 py-1 hover:bg-white/5 hover:text-white" onClick={() => setMonth(shiftMonth(month, 1))} aria-label="Next month">
          ›
        </button>
      </div>

      {statuses.length > 0 ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
          <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${(paid / statuses.length) * 100}%` }} />
        </div>
      ) : null}

      {statuses.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Add rent, phone, subscriptions… with a due day. Atlas ticks them off when a statement shows the payment, or you tick them yourself.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {statuses.map((status) => (
            <PaymentWidget key={status.payment.id} status={status} onEdit={() => setEditing(status.payment)} />
          ))}
        </ul>
      )}

      {inactive.length > 0 ? (
        <p className="mt-3 text-xs text-slate-600">
          Inactive:{" "}
          {inactive.map((payment, index) => (
            <button key={payment.id} type="button" className="hover:text-slate-300" onClick={() => setEditing(payment)}>
              {payment.name}
              {index < inactive.length - 1 ? ", " : ""}
            </button>
          ))}
        </p>
      ) : null}

      {editing ? <RequiredPaymentForm payment={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </Card>
  );
}
