"use client";

import Card from "../Card";
import { dashboardLayout } from "../../_lib/mock";
import { STORAGE_KEYS } from "../../_lib/storage-keys";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import type { DashboardLayout, DashboardWidget } from "../../_lib/types/dashboard-widget";

function orderWidgets(widgets: DashboardWidget[]) {
  return [...widgets].sort((first, second) => first.order - second.order);
}

function normalizeOrder(widgets: DashboardWidget[]) {
  return widgets.map((widget, index) => ({ ...widget, order: (index + 1) * 10 }));
}

export default function DashboardSettingsPanel() {
  const [layout, setLayout, , resetLayout] = useLocalStorageState<DashboardLayout>(STORAGE_KEYS.dashboardLayout, dashboardLayout);

  function updateWidgets(updater: (widgets: DashboardWidget[]) => DashboardWidget[]) {
    setLayout((current) => ({ ...current, widgets: normalizeOrder(updater(orderWidgets(current.widgets))), updatedAt: new Date().toISOString() }));
  }


  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Dashboard</p>
          <h2 className="mt-2 text-2xl font-black text-white">Widget layout</h2>
          <p className="mt-2 text-sm text-slate-400">Order and visibility are saved locally. Use dashboard edit mode for per-widget settings and duplication.</p>
        </div>
        <button type="button" onClick={resetLayout} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">Reset Layout</button>
      </div>

      <div className="mt-5 space-y-3">
        {orderWidgets(layout.widgets).map((widget) => (
          <div key={widget.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/45 p-4 md:grid-cols-[1fr_auto] md:items-center">
            <div>
              <h3 className="font-bold text-white">{widget.title}</h3>
              <p className="mt-1 text-sm text-slate-400">{widget.type} / {widget.size} / {widget.visible ? "visible" : "hidden"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => updateWidgets((widgets) => widgets.map((item) => item.id === widget.id ? { ...item, visible: !item.visible } : item))} className="rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-2 text-sm text-purple-100 transition hover:bg-purple-500/20">{widget.visible ? "Hide" : "Show"}</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
