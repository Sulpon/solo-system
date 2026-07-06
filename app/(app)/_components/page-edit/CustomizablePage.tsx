"use client";

import { useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "../../_lib/storage-keys";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import { duplicateItemAfter, normalizeOrder, orderByPosition, removeItemById, toggleItemVisibility } from "../../_lib/widgets/layout-list";
import WidgetCatalogModal from "../widgets/WidgetCatalogModal";
import WidgetRenderer from "../widgets/WidgetRenderer";
import PageSectionSettingsModal from "./PageSectionSettingsModal";
import SortablePageSection from "./SortablePageSection";
import type { CatalogWidgetDefinition } from "../../_lib/widgets/catalog-types";
import type { EditablePageSection, PageSectionLayout, PageSectionLayoutItem } from "./types";

type CustomizablePageProps = Readonly<{
  pageId: string;
  title: string;
  subtitle?: string;
  sections: EditablePageSection[];
  availableWidgets?: CatalogWidgetDefinition[];
}>;

function catalogWidgetToSection(widget: CatalogWidgetDefinition): EditablePageSection {
  return {
    id: widget.id,
    title: widget.title,
    description: widget.description,
    size: widget.defaultSize,
    readOnly: true,
    content: <WidgetRenderer widget={widget} mode="live" />,
  };
}

function createDefaultLayout(pageId: string, sections: EditablePageSection[]): PageSectionLayout {
  return {
    id: pageId + "-layout",
    pageId,
    updatedAt: "2026-06-29T00:00:00.000Z",
    sections: sections.map((section, index) => ({
      id: section.id,
      baseId: section.id,
      title: section.title,
      visible: true,
      order: (index + 1) * 10,
      size: section.size,
    })),
  };
}

function reconcileLayout(layout: PageSectionLayout, defaultSections: EditablePageSection[], allSections: EditablePageSection[]) {
  const knownSectionIds = new Set(allSections.map((section) => section.id));
  const currentSections = layout.sections.filter((section) => knownSectionIds.has(section.baseId));
  const currentBaseIds = new Set(currentSections.map((section) => section.baseId));
  const missingSections = defaultSections
    .filter((section) => !currentBaseIds.has(section.id))
    .map((section, index) => ({
      id: section.id,
      baseId: section.id,
      title: section.title,
      visible: true,
      order: (currentSections.length + index + 1) * 10,
      size: section.size,
    }));

  return {
    ...layout,
    sections: normalizeOrder([...currentSections, ...missingSections]),
  };
}

function reorderById(sections: PageSectionLayoutItem[], activeId: string, overId: string) {
  if (activeId === overId) {
    return sections;
  }

  const fromIndex = sections.findIndex((section) => section.id === activeId);
  const toIndex = sections.findIndex((section) => section.id === overId);

  if (fromIndex < 0 || toIndex < 0) {
    return sections;
  }

  const next = [...sections];
  const [movedSection] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, movedSection);
  return next;
}

export default function CustomizablePage({ pageId, title, subtitle, sections, availableWidgets = [] }: CustomizablePageProps) {
  const catalogSections = useMemo(() => availableWidgets.map(catalogWidgetToSection), [availableWidgets]);
  const allSections = useMemo(() => {
    const sectionMap = new Map<string, EditablePageSection>();
    [...sections, ...catalogSections].forEach((section) => sectionMap.set(section.id, section));
    return Array.from(sectionMap.values());
  }, [catalogSections, sections]);
  const fallbackLayout = useMemo(() => createDefaultLayout(pageId, sections), [pageId, sections]);
  const storageKey = STORAGE_KEYS.pageWidgetLayoutPrefix + ":" + pageId;
  const [layout, setLayout, , resetLayout] = useLocalStorageState<PageSectionLayout>(storageKey, fallbackLayout);
  const [isEditing, setIsEditing] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [dragTargetSectionId, setDragTargetSectionId] = useState<string | null>(null);
  const [settingsSection, setSettingsSection] = useState<PageSectionLayoutItem | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const dragTargetSectionIdRef = useRef<string | null>(null);

  const sectionContentById = useMemo(
    () => new Map(allSections.map((section) => [section.id, section.content])),
    [allSections],
  );

  const reconciledSections = useMemo(
    () => reconcileLayout(layout, sections, allSections).sections,
    [allSections, layout, sections],
  );

  const renderedSections = useMemo(() => {
    const ordered = orderByPosition(reconciledSections);
    return isEditing ? ordered : ordered.filter((section) => section.visible);
  }, [isEditing, reconciledSections]);

  const activeBaseIds = useMemo(() => new Set(reconciledSections.map((section) => section.baseId)), [reconciledSections]);

  function updateSections(updater: (sections: PageSectionLayoutItem[]) => PageSectionLayoutItem[]) {
    setLayout((current) => ({
      ...current,
      pageId,
      sections: normalizeOrder(updater(orderByPosition(reconcileLayout(current, sections, allSections).sections))),
      updatedAt: new Date().toISOString(),
    }));
  }

  function handleDragEnter(overId: string) {
    if (!draggingSectionId) {
      return;
    }

    if (dragTargetSectionIdRef.current === overId) {
      return;
    }

    dragTargetSectionIdRef.current = overId;
    setDragTargetSectionId(overId);

    if (draggingSectionId === overId) {
      return;
    }

    updateSections((currentSections) => reorderById(currentSections, draggingSectionId, overId));
  }

  function endDrag() {
    setDraggingSectionId(null);
    setDragTargetSectionId(null);
    dragTargetSectionIdRef.current = null;
  }

  function toggleVisibility(sectionId: string) {
    updateSections((currentSections) => toggleItemVisibility(currentSections, sectionId));
  }

  function duplicateSection(section: PageSectionLayoutItem) {
    updateSections((currentSections) => duplicateItemAfter(currentSections, section.id, (source) => source.baseId + "-copy-" + Date.now()));
  }

  function deleteSection(sectionId: string) {
    updateSections((currentSections) => removeItemById(currentSections, sectionId));
  }

  function addSection(section: EditablePageSection) {
    updateSections((currentSections) => [
      ...currentSections,
      {
        id: section.id,
        baseId: section.id,
        title: section.title,
        visible: true,
        order: (currentSections.length + 1) * 10,
        size: section.size,
      },
    ]);
    setLibraryOpen(false);
  }

  function saveSection(nextSection: PageSectionLayoutItem) {
    updateSections((currentSections) => currentSections.map((section) => (section.id === nextSection.id ? nextSection : section)));
    setSettingsSection(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-500/20 bg-slate-950/45 p-4 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Page Layout</p>
          <h1 className="mt-1 text-2xl font-black text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <>
              <button type="button" onClick={() => setLibraryOpen(true)} className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20">
                Add Widget
              </button>
              <button type="button" onClick={resetLayout} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
                Reset Layout
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => {
              endDrag();
              setIsEditing((current) => !current);
            }}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            {isEditing ? "Done Editing" : "Edit Page"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
          Customize mode is active. These widgets are read-only progress and statistics panels; use the proper pages/forms to edit quests, goals, XP, and milestones.
        </div>
      ) : null}

      <div className="grid grid-flow-row-dense gap-6 lg:grid-cols-12">
        {renderedSections.map((section) => {
          const content = sectionContentById.get(section.baseId);

          if (!content) {
            return null;
          }

          return (
            <SortablePageSection
              key={section.id}
              item={section}
              isEditing={isEditing}
              isDragging={draggingSectionId === section.id}
              isDragTarget={dragTargetSectionId === section.id && draggingSectionId !== section.id}
              onDragStart={setDraggingSectionId}
              onDragEnter={handleDragEnter}
              onDragEnd={endDrag}
              onHide={() => toggleVisibility(section.id)}
              onSettings={() => setSettingsSection(section)}
              onDuplicate={undefined}
              onDelete={() => deleteSection(section.id)}
            >
              {content}
            </SortablePageSection>
          );
        })}
      </div>

      {settingsSection ? (
        <PageSectionSettingsModal item={settingsSection} onClose={() => setSettingsSection(null)} onSave={saveSection} />
      ) : null}
      {libraryOpen ? (
        <WidgetCatalogModal
          widgets={availableWidgets}
          alreadyAddedIds={activeBaseIds}
          onAdd={(widget) => addSection(catalogWidgetToSection(widget))}
          onClose={() => setLibraryOpen(false)}
        />
      ) : null}
    </div>
  );
}
