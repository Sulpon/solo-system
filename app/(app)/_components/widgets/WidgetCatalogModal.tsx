"use client";

import { useMemo, useState } from "react";
import Modal from "../Modal";
import WidgetRenderer from "./WidgetRenderer";
import type { CatalogWidgetDefinition } from "../../_lib/widgets/catalog-types";

type SortMode = "category" | "title";

type WidgetCatalogModalProps = Readonly<{
  widgets: ReadonlyArray<CatalogWidgetDefinition>;
  alreadyAddedIds: ReadonlySet<string>;
  onAdd: (widget: CatalogWidgetDefinition) => void;
  onClose: () => void;
}>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";

function formatPageLabel(pageId: string) {
  if (pageId === "dashboard") {
    return "Dashboard";
  }

  if (pageId === "goal-tree") {
    return "Goal Tree";
  }

  if (pageId === "attributes") {
    return "Attribute Pages";
  }

  return pageId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function WidgetCatalogModal({ widgets, alreadyAddedIds, onAdd, onClose }: WidgetCatalogModalProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [sortMode, setSortMode] = useState<SortMode>("category");

  const categories = useMemo(() => ["All", ...Array.from(new Set(widgets.map((widget) => widget.category))).sort()], [widgets]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    const results = widgets.filter((widget) => {
      const matchesCategory = activeCategory === "All" || widget.category === activeCategory;
      const matchesSearch =
        query.length === 0 ||
        widget.title.toLowerCase().includes(query) ||
        widget.description.toLowerCase().includes(query) ||
        widget.searchKeywords.some((keyword) => keyword.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });

    return [...results].sort((first, second) => {
      if (sortMode === "title") {
        return first.title.localeCompare(second.title);
      }

      return first.category.localeCompare(second.category) || first.title.localeCompare(second.title);
    });
  }, [activeCategory, search, sortMode, widgets]);

  return (
    <Modal title="Widget Catalog" onClose={onClose} wide>
      <div className="space-y-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <input value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} placeholder="Search widgets by name, description, or keyword..." />
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className={inputClass + " lg:w-52"}>
            <option value="category">Sort: Category</option>
            <option value="title">Sort: Name (A-Z)</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={
                "rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.16em] transition " +
                (activeCategory === category
                  ? "border-purple-400/60 bg-purple-500/15 text-white shadow-[0_0_18px_rgba(168,85,247,0.14)]"
                  : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/50 hover:text-white")
              }
            >
              {category}
            </button>
          ))}
        </div>

        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{filtered.length} widgets</p>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((widget) => {
            const isAdded = alreadyAddedIds.has(widget.id);

            return (
              <div key={widget.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/55 shadow-[0_0_24px_rgba(2,6,23,0.35)]">
                <div className="relative h-52 overflow-hidden border-b border-slate-800 bg-slate-950/70 p-3">
                  <div className="pointer-events-none origin-top-left" style={{ transform: "scale(0.82)", width: "122%" }}>
                    <WidgetRenderer widget={widget} mode="preview" />
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-slate-950 to-transparent" />
                  {isAdded ? (
                    <span className="absolute right-3 top-3 rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-200">
                      Already Added
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-white">{widget.title}</h3>
                    <span className="shrink-0 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-slate-400">{widget.category}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-400">{widget.description}</p>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {widget.supportedPages.slice(0, 3).map((page) => (
                      <span key={page} className="rounded-full border border-slate-800 bg-slate-950/60 px-2 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">
                        {formatPageLabel(page)}
                      </span>
                    ))}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {widget.allowedSizes.map((size) => (
                      <span key={size} className="rounded-md border border-slate-800 bg-slate-950/50 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-600">
                        {size}
                      </span>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onAdd(widget)}
                    disabled={isAdded}
                    className="mt-4 w-full rounded-xl border border-purple-400/50 bg-purple-500/15 px-3 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/50 disabled:text-slate-500"
                  >
                    {isAdded ? "Added" : "Add Widget"}
                  </button>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center text-sm text-slate-400">No widgets match your search.</div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
