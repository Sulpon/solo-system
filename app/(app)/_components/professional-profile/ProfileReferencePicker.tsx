"use client";

const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export type ProfileReferenceItem = Readonly<{ id: string; title: string; subtitle?: string }>;

type ProfileReferencePickerProps = Readonly<{
  label: string;
  items: ReadonlyArray<ProfileReferenceItem>;
  selectedIds: ReadonlyArray<string>;
  onChange: (next: string[]) => void;
  emptyMessage: string;
}>;

export default function ProfileReferencePicker({ label, items, selectedIds, onChange, emptyMessage }: ProfileReferencePickerProps) {
  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((current) => current !== id) : [...selectedIds, id]);
  }

  return (
    <div>
      <p className={labelClass}>{label}</p>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={
                  "flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition " +
                  (selected
                    ? "border-purple-400/50 bg-purple-500/15 text-white"
                    : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-purple-400/30 hover:text-white")
                }
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{item.title}</span>
                  {item.subtitle ? <span className="block truncate text-xs text-slate-500">{item.subtitle}</span> : null}
                </span>
                <span className={"shrink-0 text-xs uppercase tracking-[0.18em] " + (selected ? "text-purple-200" : "text-slate-500")}>{selected ? "Linked" : "Off"}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
