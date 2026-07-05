"use client";

import Modal from "../Modal";
import type { EditablePageSection } from "./types";

type PageWidgetLibraryModalProps = Readonly<{
  widgets: EditablePageSection[];
  onAdd: (widget: EditablePageSection) => void;
  onClose: () => void;
}>;

export default function PageWidgetLibraryModal({ widgets, onAdd, onClose }: PageWidgetLibraryModalProps) {
  return (
    <Modal title="Add Widget" onClose={onClose}>
      <div className="space-y-3">
        {widgets.length > 0 ? (
          widgets.map((widget) => (
            <div key={widget.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="min-w-0">
                <p className="font-semibold text-white">{widget.title}</p>
                <p className="mt-1 text-sm text-slate-400">{widget.description ?? "Read-only progress widget."}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-300">Read-only</p>
              </div>
              <button
                type="button"
                onClick={() => onAdd(widget)}
                className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
              >
                Add
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-sm text-slate-400">
            Every available widget is already on this page.
          </div>
        )}
      </div>
    </Modal>
  );
}
