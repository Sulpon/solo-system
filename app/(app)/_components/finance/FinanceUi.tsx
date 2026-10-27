import { formatMoney } from "../../_lib/finance/money";
import type { FinanceCategory } from "../../_lib/finance/types";

// Small shared pieces for the Finance module, in Atlas's existing visual
// vocabulary (see Card, Cards page, Modal).

export const INCOME_COLOR = "#0891b2";
export const EXPENSE_COLOR = "#9333ea";

export const inputClass =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-[rgb(var(--atlas-accent,168_85_247)/0.7)]";

export const buttonClass =
  "rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-[rgb(var(--atlas-accent,168_85_247)/0.6)] hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

export const primaryButtonClass =
  "rounded-xl border border-[rgb(var(--atlas-accent,168_85_247)/0.5)] bg-[rgb(var(--atlas-accent,168_85_247)/0.14)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[rgb(var(--atlas-accent,168_85_247)/0.24)] disabled:cursor-not-allowed disabled:opacity-40";

export const dangerButtonClass =
  "rounded-xl border border-rose-500/40 px-3 py-2 text-sm text-rose-200 transition hover:border-rose-400 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40";

export function Money({ minor, currency, signed = false, className = "" }: Readonly<{ minor: number; currency: string; signed?: boolean; className?: string }>) {
  const tone = signed ? (minor > 0 ? "text-cyan-300" : minor < 0 ? "text-slate-100" : "text-slate-400") : "";
  return <span className={"tabular-nums " + tone + " " + className}>{formatMoney(minor, currency, { signed })}</span>;
}

export function SectionHeading({ title, detail, action }: Readonly<{ title: string; detail?: string; action?: React.ReactNode }>) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="atlas-display text-lg font-black text-white">{title}</h2>
        {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ text, children }: Readonly<{ text: string; children?: React.ReactNode }>) {
  return (
    <div className="rounded-xl border border-dashed border-slate-700/80 p-6 text-center">
      <p className="text-sm text-slate-400">{text}</p>
      {children ? <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = "slate" }: Readonly<{ children: React.ReactNode; tone?: "slate" | "cyan" | "purple" | "amber" | "rose" | "emerald" }>) {
  const tones = {
    slate: "border-slate-700 text-slate-300",
    cyan: "border-cyan-500/40 text-cyan-200",
    purple: "border-purple-500/40 text-purple-200",
    amber: "border-amber-500/40 text-amber-200",
    rose: "border-rose-500/40 text-rose-200",
    emerald: "border-emerald-500/40 text-emerald-200",
  };
  return <span className={"inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold " + tones[tone]}>{children}</span>;
}

export function CategoryDot({ category }: Readonly<{ category: FinanceCategory | null | undefined }>) {
  return <span aria-hidden className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: category?.color ?? "#64748b" }} />;
}

// Category picker grouped by meaning, enabled categories only (plus the
// current value, so editing an old transaction never hides its category).
export function CategorySelect({
  categories,
  value,
  onChange,
  includeUncategorised = true,
  className = inputClass,
  ariaLabel = "Category",
}: Readonly<{
  categories: ReadonlyArray<FinanceCategory>;
  value: string | null;
  onChange: (categoryId: string | null) => void;
  includeUncategorised?: boolean;
  className?: string;
  ariaLabel?: string;
}>) {
  const visible = categories.filter((category) => category.isEnabled || category.id === value);
  const groups: Array<[string, FinanceCategory[]]> = [
    ["Spending", visible.filter((category) => category.kind === "expense")],
    ["Income", visible.filter((category) => category.kind === "income")],
    ["Debt", visible.filter((category) => category.kind === "debt")],
    ["Not income or spending", visible.filter((category) => category.kind === "transfer" || category.kind === "exchange")],
  ];

  return (
    <select aria-label={ariaLabel} className={className} value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}>
      {includeUncategorised ? <option value="">Needs review</option> : null}
      {groups
        .filter(([, items]) => items.length > 0)
        .map(([label, items]) => (
          <optgroup key={label} label={label}>
            {items.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </optgroup>
        ))}
    </select>
  );
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function downloadTextFile(name: string, text: string, type = "text/csv;charset=utf-8") {
  const url = URL.createObjectURL(new Blob(["﻿" + text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
