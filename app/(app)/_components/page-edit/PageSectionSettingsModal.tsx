"use client";

import { useState } from "react";
import Modal from "../Modal";
import { useWidgetLiveContext } from "../../_lib/widgets/catalog-helpers";
import type { CatalogWidgetDefinition } from "../../_lib/widgets/catalog-types";
import type { PageSectionLayoutItem, PageSectionSize } from "./types";

type PageSectionSettingsModalProps = Readonly<{
  item: PageSectionLayoutItem;
  widget?: CatalogWidgetDefinition;
  onClose: () => void;
  onSave: (item: PageSectionLayoutItem) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";

export default function PageSectionSettingsModal({ item, widget, onClose, onSave }: PageSectionSettingsModalProps) {
  const [title, setTitle] = useState(item.title);
  const [size, setSize] = useState<PageSectionSize>(item.size);
  const [config, setConfig] = useState<Record<string, string>>(item.config ?? {});
  const liveContext = useWidgetLiveContext();

  return (
    <Modal title="Section Settings" onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className={labelClass}>Label</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
        </label>
        <label className="space-y-2">
          <span className={labelClass}>Size</span>
          <select value={size} onChange={(event) => setSize(event.target.value as PageSectionSize)} className={inputClass}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="xl">Full Width</option>
          </select>
        </label>
        {widget?.configFields?.map((field) => {
          const options = field.options(liveContext);

          return (
            <label key={field.key} className="space-y-2 sm:col-span-2">
              <span className={labelClass}>{field.label}</span>
              <select value={config[field.key] ?? ""} onChange={(event) => setConfig((current) => ({ ...current, [field.key]: event.target.value }))} className={inputClass}>
                <option value="">Select {field.label.toLowerCase()}</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          );
        })}
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">Cancel</button>
        <button type="button" onClick={() => onSave({ ...item, title, size, config: widget?.configFields ? config : item.config })} className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25">Save Section</button>
      </div>
    </Modal>
  );
}
