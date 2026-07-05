"use client";

import type { ButtonHTMLAttributes, RefCallback } from "react";
import type { DashboardWidget } from "../../_lib/types/dashboard-widget";

type WidgetEditOverlayProps = Readonly<{
  widget: DashboardWidget;
  dragHandleProps: ButtonHTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: RefCallback<HTMLButtonElement>;
  canHide?: boolean;
  canDuplicate?: boolean;
  canDelete?: boolean;
  onHide: () => void;
  onSettings: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}>;

const buttonClass = "rounded-lg border border-slate-700/80 bg-slate-950/80 px-2 py-1 text-xs text-slate-200 transition hover:border-purple-400/70 hover:text-white";

export default function WidgetEditOverlay({
  widget,
  dragHandleProps,
  dragHandleRef,
  canHide = true,
  canDuplicate = true,
  canDelete = true,
  onHide,
  onSettings,
  onDuplicate,
  onDelete,
}: WidgetEditOverlayProps) {
  return (
    <div className="absolute inset-x-1 top-1 z-20 pointer-events-none">
      <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-xl border border-cyan-300/30 bg-slate-950/95 p-2 shadow-[0_0_24px_rgba(34,211,238,0.18)] backdrop-blur-xl">
        <button
          type="button"
          {...dragHandleProps}
          ref={dragHandleRef}
          className="mr-auto cursor-grab rounded-lg border border-cyan-300/40 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200 transition active:cursor-grabbing hover:border-cyan-200"
          aria-label={"Drag " + widget.title}
        >
          Widget
        </button>
        {canHide ? (
          <button type="button" onClick={onHide} className={buttonClass}>
            {widget.visible ? "Hide" : "Show"}
          </button>
        ) : null}
        <button type="button" onClick={onSettings} className={buttonClass}>
          Settings
        </button>
        {canDuplicate ? (
          <button type="button" onClick={onDuplicate} className={buttonClass}>
            Duplicate
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" onClick={onDelete} className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-200 transition hover:border-rose-300 hover:text-white">
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}
