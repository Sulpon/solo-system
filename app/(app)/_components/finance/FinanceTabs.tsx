"use client";

export type FinanceTab = "overview" | "transactions" | "review" | "imports" | "budgets" | "settings";

const TABS: ReadonlyArray<Readonly<{ id: FinanceTab; label: string }>> = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "review", label: "Review" },
  { id: "imports", label: "Import" },
  { id: "budgets", label: "Budgets" },
  { id: "settings", label: "Categories & rules" },
];

export default function FinanceTabs({ active, onChange, counts }: Readonly<{ active: FinanceTab; onChange: (tab: FinanceTab) => void; counts: Partial<Record<FinanceTab, number>> }>) {
  return (
    <div role="tablist" aria-label="Finance sections" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {TABS.map((tab) => {
        const count = counts[tab.id] ?? 0;
        const selected = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={
              "shrink-0 whitespace-nowrap rounded-xl border px-3 py-2 text-sm transition " +
              (selected
                ? "border-[rgb(var(--atlas-accent,168_85_247)/0.5)] bg-[rgb(var(--atlas-accent,168_85_247)/0.15)] text-white"
                : "border-transparent text-slate-400 hover:border-slate-700 hover:text-white")
            }
          >
            {tab.label}
            {count > 0 ? <span className="ml-2 rounded-full bg-amber-500/20 px-1.5 text-xs text-amber-200">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
