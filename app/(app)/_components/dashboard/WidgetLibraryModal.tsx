"use client";

import { useMemo, useState } from "react";
import Modal from "../Modal";
import { dashboardWidgetCatalog, widgetCategories } from "../../_lib/widgets/widget-registry";
import type { DashboardWidget, DashboardWidgetType } from "../../_lib/types/dashboard-widget";

type WidgetLibraryModalProps = Readonly<{
  widgets: DashboardWidget[];
  onClose: () => void;
  onAddWidget: (widgetType: DashboardWidgetType) => void;
  onHideWidget: (widgetId: string) => void;
  onRestoreWidget: (widgetId: string) => void;
  onDeleteWidget: (widgetId: string) => void;
  onEditWidget: (widget: DashboardWidget) => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

function getWidgetIconClass(category: string) {
  switch (category) {
    case "Character":
      return "border-purple-400/30 bg-purple-400/10 text-purple-200";
    case "Quests":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
    case "Trading":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "Productivity":
      return "border-sky-400/30 bg-sky-400/10 text-sky-200";
    case "Health":
      return "border-rose-400/30 bg-rose-400/10 text-rose-200";
    case "Learning":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "Finance":
      return "border-yellow-400/30 bg-yellow-400/10 text-yellow-200";
    case "Social":
      return "border-fuchsia-400/30 bg-fuchsia-400/10 text-fuchsia-200";
    case "AI":
      return "border-violet-400/30 bg-violet-400/10 text-violet-200";
    case "Experimental":
      return "border-orange-400/30 bg-orange-400/10 text-orange-200";
    default:
      return "border-slate-700 bg-slate-950/50 text-slate-200";
  }
}

export default function WidgetLibraryModal({
  widgets,
  onClose,
  onAddWidget,
  onHideWidget,
  onRestoreWidget,
  onDeleteWidget,
  onEditWidget,
}: WidgetLibraryModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<(typeof widgetCategories)[number] | "All">("All");

  const visibleWidgets = useMemo(() => widgets.filter((widget) => widget.visible), [widgets]);
  const hiddenWidgets = useMemo(() => widgets.filter((widget) => !widget.visible), [widgets]);
  const filteredDefinitions = useMemo(() => {
    const query = search.trim().toLowerCase();

    return dashboardWidgetCatalog.filter((definition) => {
      const matchesCategory = activeCategory === "All" || definition.category === activeCategory;
      const matchesSearch =
        query.length === 0 ||
        definition.title.toLowerCase().includes(query) ||
        definition.description.toLowerCase().includes(query) ||
        definition.category.toLowerCase().includes(query);

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, search]);

  function getVisibleInstance(type: DashboardWidgetType) {
    return visibleWidgets.find((widget) => widget.type === type) ?? null;
  }

  function getHiddenInstances(type: DashboardWidgetType) {
    return hiddenWidgets.filter((widget) => widget.type === type);
  }

  return (
    <Modal title="Widget Library" onClose={onClose}>
      <div className="space-y-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className={inputClass}
            placeholder="Search widgets"
          />
          <div className="flex flex-wrap gap-2">
            {(["All", ...widgetCategories] as const).map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={
                  "rounded-full border px-3 py-2 text-xs uppercase tracking-[0.18em] transition " +
                  (activeCategory === category
                    ? "border-purple-400/60 bg-purple-500/15 text-white shadow-[0_0_18px_rgba(168,85,247,0.14)]"
                    : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/50 hover:text-white")
                }
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Widget Catalog</p>
              <h3 className="mt-1 text-lg font-black text-white">Add widgets to the workspace</h3>
            </div>
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{filteredDefinitions.length} results</p>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {filteredDefinitions.map((definition) => {
              const visibleInstance = getVisibleInstance(definition.id);
              const hiddenInstances = getHiddenInstances(definition.id);

              return (
                <div key={definition.id} className="rounded-2xl border border-slate-800 bg-slate-950/55 p-4 shadow-[0_0_24px_rgba(2,6,23,0.35)]">
                  <div className="flex items-start gap-3">
                    <div className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-sm font-black " + getWidgetIconClass(definition.category)}>
                      {definition.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-white">{definition.title}</h4>
                        <span className="rounded-full border border-slate-700 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">{definition.category}</span>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{definition.description}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        Default row: {definition.defaultRow} / size: {definition.defaultSize}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onAddWidget(definition.id)}
                      className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-3 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
                    >
                      Add Widget
                    </button>
                    {visibleInstance && definition.canHide ? (
                      <button
                        type="button"
                        onClick={() => onHideWidget(visibleInstance.id)}
                        className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 transition hover:border-slate-500 hover:text-white"
                      >
                        Remove
                      </button>
                    ) : null}
                    {visibleInstance ? (
                      <button
                        type="button"
                        onClick={() => onEditWidget(visibleInstance)}
                        className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/15"
                      >
                        Settings
                      </button>
                    ) : null}
                  </div>

                  {hiddenInstances.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hidden Widgets</p>
                      <div className="mt-3 space-y-2">
                        {hiddenInstances.map((widget) => (
                          <div key={widget.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-white">{widget.title}</p>
                              <p className="text-xs text-slate-500">{widget.type}</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => onRestoreWidget(widget.id)}
                                className="rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-400/20"
                              >
                                Restore
                              </button>
                              {dashboardWidgetCatalog.find((definition) => definition.id === widget.type)?.canDelete ? (
                                <button
                                  type="button"
                                  onClick={() => onDeleteWidget(widget.id)}
                                  className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 transition hover:border-rose-300 hover:text-white"
                                >
                                  Delete
                                </button>
                              ) : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
