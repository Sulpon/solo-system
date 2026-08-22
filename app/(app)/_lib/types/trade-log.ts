// A Trade Log Entry records qualifying backtest trades on a specific day -
// the real source of truth for the Backtest Challenge (and, cumulatively,
// the long-term trade-count milestone). Multiple entries can exist for the
// same day; totals are summed per day, same convention as writing-log.ts.

export type TradeLogEntry = Readonly<{
  id: string;
  date: string; // local day key, "YYYY-MM-DD"
  count: number;
  createdAt: string;
}>;

export function createTradeLogId() {
  return `trade-log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
