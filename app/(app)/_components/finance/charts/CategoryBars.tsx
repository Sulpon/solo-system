import type { CategoryTotal } from "../../../_lib/finance/analytics";
import { formatMoney } from "../../../_lib/finance/money";
import { EmptyState, EXPENSE_COLOR } from "../FinanceUi";

// Spending by category: magnitude, so one hue; identity comes from the
// row label, never from colour. Each bar is labelled with its value and
// share, which doubles as the table view. Hover shows the line count.

const MAX_ROWS = 8;

export default function CategoryBars({ rows, currency, color = EXPENSE_COLOR, emptyText }: Readonly<{ rows: ReadonlyArray<CategoryTotal>; currency: string; color?: string; emptyText: string }>) {
  const positive = rows.filter((row) => row.amountMinor > 0);
  const total = positive.reduce((sum, row) => sum + row.amountMinor, 0);

  if (positive.length === 0) {
    return <EmptyState text={emptyText} />;
  }

  // Beyond eight categories the tail folds into "Other", so the chart
  // never grows a long unreadable list.
  const shown = positive.slice(0, MAX_ROWS);
  const rest = positive.slice(MAX_ROWS);
  const display = rest.length
    ? [...shown, { categoryId: "__other", name: `Other (${rest.length})`, color: "#64748b", amountMinor: rest.reduce((sum, row) => sum + row.amountMinor, 0), count: rest.reduce((sum, row) => sum + row.count, 0) }]
    : shown;
  const max = Math.max(...display.map((row) => row.amountMinor));

  return (
    <ul className="space-y-2.5">
      {display.map((row) => {
        const share = total > 0 ? Math.round((row.amountMinor / total) * 100) : 0;
        return (
          <li key={row.categoryId ?? "none"} className="group" title={`${row.name}: ${formatMoney(row.amountMinor, currency)} across ${row.count} transaction${row.count === 1 ? "" : "s"}`}>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-slate-200">{row.name}</span>
              <span className="shrink-0 tabular-nums text-slate-300">
                {formatMoney(row.amountMinor, currency)} <span className="text-xs text-slate-500">{share}%</span>
              </span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-[width,filter] duration-300 group-hover:brightness-125"
                style={{ width: `${Math.max(2, (row.amountMinor / max) * 100)}%`, backgroundColor: color }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
