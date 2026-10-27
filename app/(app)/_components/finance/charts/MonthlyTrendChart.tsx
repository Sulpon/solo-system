"use client";

import { useState } from "react";
import type { MonthlyPoint } from "../../../_lib/finance/analytics";
import { formatMoney } from "../../../_lib/finance/money";
import { EXPENSE_COLOR, INCOME_COLOR } from "../FinanceUi";

// Income vs spending per month, one currency, one axis. Paired bars with a
// 2px gap, rounded data ends anchored to the baseline, a legend, a hover
// tooltip per month and a table toggle for exact values.

function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return new Date(Date.UTC(year, number - 1, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
}

export default function MonthlyTrendChart({ points, currency }: Readonly<{ points: ReadonlyArray<MonthlyPoint>; currency: string }>) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const max = Math.max(1, ...points.flatMap((point) => [point.incomeMinor, point.expenseMinor]));
  const active = points.find((point) => point.month === hovered) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: INCOME_COLOR }} /> Income
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: EXPENSE_COLOR }} /> Spending
          </span>
        </div>
        <button type="button" className="text-slate-400 underline-offset-2 hover:text-white hover:underline" onClick={() => setShowTable((value) => !value)}>
          {showTable ? "Show chart" : "Show table"}
        </button>
      </div>

      {showTable ? (
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="py-1 font-semibold">Month</th>
              <th className="py-1 text-right font-semibold">Income</th>
              <th className="py-1 text-right font-semibold">Spending</th>
              <th className="py-1 text-right font-semibold">Net</th>
            </tr>
          </thead>
          <tbody className="tabular-nums text-slate-300">
            {points.map((point) => (
              <tr key={point.month} className="border-t border-slate-800">
                <td className="py-1.5">{point.month}</td>
                <td className="py-1.5 text-right">{formatMoney(point.incomeMinor, currency)}</td>
                <td className="py-1.5 text-right">{formatMoney(point.expenseMinor, currency)}</td>
                <td className="py-1.5 text-right">{formatMoney(point.incomeMinor - point.expenseMinor, currency, { signed: true })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative mt-3">
          <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-slate-800" />
          <div className="pointer-events-none absolute left-0 top-0 -translate-y-1/2 bg-slate-950/80 pr-1 text-[10px] tabular-nums text-slate-500">
            {formatMoney(max, currency, { compact: true })}
          </div>
          <div className="flex h-40 items-end gap-1 border-b border-slate-700 sm:gap-2" onMouseLeave={() => setHovered(null)}>
            {points.map((point) => (
              <div
                key={point.month}
                className={"flex h-full flex-1 items-end justify-center gap-[2px] rounded-t-md px-0.5 " + (hovered === point.month ? "bg-white/5" : "")}
                onMouseEnter={() => setHovered(point.month)}
                onFocus={() => setHovered(point.month)}
                tabIndex={0}
                aria-label={`${point.month}: income ${formatMoney(point.incomeMinor, currency)}, spending ${formatMoney(point.expenseMinor, currency)}`}
              >
                <div className="w-full max-w-[14px] rounded-t" style={{ height: `${Math.max(0, (point.incomeMinor / max) * 100)}%`, backgroundColor: INCOME_COLOR }} />
                <div className="w-full max-w-[14px] rounded-t" style={{ height: `${Math.max(0, (point.expenseMinor / max) * 100)}%`, backgroundColor: EXPENSE_COLOR }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1 sm:gap-2">
            {points.map((point) => (
              <div key={point.month} className="flex-1 text-center text-[10px] text-slate-500">
                {monthLabel(point.month)}
              </div>
            ))}
          </div>
          {active ? (
            <div className="pointer-events-none absolute right-0 top-2 rounded-lg border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-xl">
              <p className="font-semibold text-white">{active.month}</p>
              <p className="tabular-nums text-slate-300">Income {formatMoney(active.incomeMinor, currency)}</p>
              <p className="tabular-nums text-slate-300">Spending {formatMoney(active.expenseMinor, currency)}</p>
              <p className="tabular-nums text-slate-400">Net {formatMoney(active.incomeMinor - active.expenseMinor, currency, { signed: true })}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
