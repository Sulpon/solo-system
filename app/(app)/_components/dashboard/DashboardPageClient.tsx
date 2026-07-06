"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragCancelEvent,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
} from "@dnd-kit/core";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useLocalStorageState } from "../../_lib/hooks/use-local-storage-state";
import { useProgression } from "../../_lib/hooks/useProgression";
import { STORAGE_KEYS } from "../../_lib/storage-keys";
import { getTodayQuests } from "../../_lib/daily-system";
import { duplicateItemAfter, normalizeOrder, orderByPosition, removeItemById, toggleItemVisibility } from "../../_lib/widgets/layout-list";
import type { DailyQuest, Quest } from "../../_lib/types/quest";
import type { DashboardGridLayout, DashboardLayout, DashboardRow, DashboardWidget } from "../../_lib/types/dashboard-widget";
import { WIDGET_LAYOUT_VERSION, createDefaultDashboardGridLayout, createDefaultDashboardLayout, createWidgetFromType, getWidgetDefinition, normalizeWidget } from "../../_lib/widgets/widget-registry";
import { getCatalogWidget, getCatalogWidgetsForPage } from "../../_lib/widgets/catalog-registry";
import { dashboardNativeCatalogWidgets } from "../../_lib/widgets/dashboard-native-previews";
import WidgetCatalogModal from "../widgets/WidgetCatalogModal";
import DashboardWidgetRenderer from "./DashboardWidgetRenderer";
import SortableWidgetFrame from "./SortableWidgetFrame";
import WidgetSettingsModal from "./WidgetSettingsModal";

type DropPosition = "left" | "right" | "above" | "below" | "row" | "new-row";
type WidgetZonePosition = "left" | "right" | "above" | "below" | "center";

type WidgetDropIntent =
  | Readonly<{ type: "widget"; rowId: string; widgetId: string; position: Exclude<DropPosition, "row" | "new-row"> }>
  | Readonly<{ type: "row"; rowId: string }>
  | Readonly<{ type: "new-row" }>;

type DropZoneData =
  | Readonly<{ type: "widget"; rowId: string; widgetId: string; position: WidgetZonePosition }>
  | Readonly<{ type: "row"; rowId: string }>
  | Readonly<{ type: "new-row" }>;

type DragSize = Readonly<{ width: number; height: number }>;

function toDailyQuest(quest: Quest): DailyQuest {
  return {
    id: quest.id,
    title: quest.title,
    description: quest.description ?? "",
    category: quest.categoryId,
    xp: quest.xp,
    importance: quest.importance ?? "core",
    scheduledDays: quest.scheduledDays ?? [],
    completed: false,
    linkedProgressGoalId: quest.linkedProgressGoalId ?? null,
    attributeXPOverride: quest.attributeXPOverride ?? [],
  };
}

function cloneRows(rows: DashboardRow[]) {
  return rows.map((row) => ({ ...row, widgetIds: [...row.widgetIds] }));
}

function cleanRows(rows: DashboardRow[]) {
  return rows.filter((row) => row.widgetIds.length > 0);
}

function makePreviewRowId(activeWidgetId: string, anchorRowId: string, position: "above" | "below" | "new-row") {
  return `preview-row-${position}-${anchorRowId}-${activeWidgetId}`;
}

function ensureUniqueRowId(rowId: string, seenRowIds: Set<string>) {
  if (!seenRowIds.has(rowId)) {
    seenRowIds.add(rowId);
    return rowId;
  }

  let suffix = 2;
  let nextRowId = `${rowId}-${suffix}`;

  while (seenRowIds.has(nextRowId)) {
    suffix += 1;
    nextRowId = `${rowId}-${suffix}`;
  }

  seenRowIds.add(nextRowId);
  return nextRowId;
}

function createFallbackGrid(widgets: DashboardWidget[]): DashboardGridLayout {
  return {
    id: "dashboard-grid-layout",
    layoutVersion: WIDGET_LAYOUT_VERSION,
    updatedAt: "2026-06-29T00:00:00.000Z",
    rows: orderByPosition(widgets).map((widget) => ({ id: "row-" + widget.id, widgetIds: [widget.id] })),
  };
}

function reconcileGrid(grid: DashboardGridLayout, widgets: DashboardWidget[]): DashboardGridLayout {
  const validWidgetIds = new Set(widgets.map((widget) => widget.id));
  const seenWidgetIds = new Set<string>();
  const seenRowIds = new Set<string>();

  const nextRows = grid.rows
    .map((row) => ({
      ...row,
      id: ensureUniqueRowId(row.id, seenRowIds),
      widgetIds: row.widgetIds.filter((widgetId) => {
        if (!validWidgetIds.has(widgetId) || seenWidgetIds.has(widgetId)) {
          return false;
        }

        seenWidgetIds.add(widgetId);
        return true;
      }),
    }))
    .filter((row) => row.widgetIds.length > 0);

  const missingRows = orderByPosition(widgets)
    .filter((widget) => !seenWidgetIds.has(widget.id))
    .map((widget) => ({ id: ensureUniqueRowId("row-" + widget.id, seenRowIds), widgetIds: [widget.id] }));

  return { ...grid, rows: [...nextRows, ...missingRows] };
}

function materializeGridLayout(layout: DashboardGridLayout, widgets: DashboardWidget[]) {
  const materializedRows = layout.rows.map((row) =>
    row.id.startsWith("preview-row-")
      ? { ...row, id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }
      : row,
  );

  return reconcileGrid({ ...layout, rows: materializedRows }, widgets);
}

function removeWidgetFromRows(rows: DashboardRow[], widgetId: string) {
  return cleanRows(rows.map((row) => ({ ...row, widgetIds: row.widgetIds.filter((id) => id !== widgetId) })));
}

function insertWidgetAtTarget(rows: DashboardRow[], activeWidgetId: string, intent: WidgetDropIntent) {
  const rowsWithoutActive = removeWidgetFromRows(rows, activeWidgetId);

  if (intent.type === "new-row") {
    return [...rowsWithoutActive, { id: makePreviewRowId(activeWidgetId, "root", "new-row"), widgetIds: [activeWidgetId] }];
  }

  const originalTargetIndex = rows.findIndex((row) => row.id === intent.rowId);
  const targetRowIndex = rowsWithoutActive.findIndex((row) => row.id === intent.rowId);
  const anchorIndex = targetRowIndex >= 0 ? targetRowIndex : originalTargetIndex;

  if (intent.type === "row") {
    if (targetRowIndex >= 0) {
      const nextRows = cloneRows(rowsWithoutActive);
      nextRows[targetRowIndex] = { ...nextRows[targetRowIndex], widgetIds: [...nextRows[targetRowIndex].widgetIds, activeWidgetId] };
      return cleanRows(nextRows);
    }

    const nextRows = cloneRows(rowsWithoutActive);
    const insertIndex = Math.max(0, Math.min(nextRows.length, anchorIndex >= 0 ? anchorIndex : nextRows.length));
    nextRows.splice(insertIndex, 0, { id: makePreviewRowId(activeWidgetId, intent.rowId, "new-row"), widgetIds: [activeWidgetId] });
    return cleanRows(nextRows);
  }

  if (intent.position === "above" || intent.position === "below") {
    const nextRows = cloneRows(rowsWithoutActive);
    const insertIndex = anchorIndex >= 0 ? anchorIndex + (intent.position === "below" ? 1 : 0) : nextRows.length;
    nextRows.splice(Math.max(0, Math.min(nextRows.length, insertIndex)), 0, {
      id: makePreviewRowId(activeWidgetId, intent.rowId, intent.position),
      widgetIds: [activeWidgetId],
    });
    return cleanRows(nextRows);
  }

  if (targetRowIndex >= 0) {
    const nextRows = cloneRows(rowsWithoutActive);
    const targetRow = nextRows[targetRowIndex];
    const currentWidgetIndex = targetRow.widgetIds.indexOf(intent.widgetId);

    if (currentWidgetIndex >= 0) {
      const insertIndex = currentWidgetIndex + (intent.position === "right" ? 1 : 0);
      const nextWidgetIds = [...targetRow.widgetIds];
      nextWidgetIds.splice(insertIndex, 0, activeWidgetId);
      nextRows[targetRowIndex] = { ...targetRow, widgetIds: nextWidgetIds };
      return cleanRows(nextRows);
    }

    nextRows[targetRowIndex] = { ...targetRow, widgetIds: [...targetRow.widgetIds, activeWidgetId] };
    return cleanRows(nextRows);
  }

  const nextRows = cloneRows(rowsWithoutActive);
  const insertIndex = Math.max(0, Math.min(nextRows.length, anchorIndex >= 0 ? anchorIndex : nextRows.length));
  nextRows.splice(insertIndex, 0, { id: makePreviewRowId(activeWidgetId, intent.rowId, "new-row"), widgetIds: [activeWidgetId] });
  return cleanRows(nextRows);
}

function buildPreviewLayout(baseLayout: DashboardGridLayout, activeWidgetId: string, intent: WidgetDropIntent, widgets: DashboardWidget[]) {
  const normalizedBase = reconcileGrid(baseLayout.rows.length > 0 ? { ...baseLayout, rows: cloneRows(baseLayout.rows) } : createFallbackGrid(widgets), widgets);
  const nextRows = insertWidgetAtTarget(normalizedBase.rows, activeWidgetId, intent);

  return reconcileGrid(
    {
      ...normalizedBase,
      rows: nextRows,
      updatedAt: normalizedBase.updatedAt,
    },
    widgets,
  );
}

function getZonePriority(data?: DropZoneData | null) {
  if (!data) {
    return 0;
  }

  if (data.type === "widget") {
    return 3;
  }

  if (data.type === "row") {
    return 2;
  }

  return 1;
}

function parseDropIntent(over: Over | null): WidgetDropIntent | null {
  const data = over?.data.current as DropZoneData | undefined;

  if (!data) {
    return null;
  }

  if (data.type === "new-row") {
    return { type: "new-row" };
  }

  if (data.type === "row") {
    return { type: "row", rowId: data.rowId };
  }

  if (data.position === "center") {
    return { type: "row", rowId: data.rowId };
  }

  return {
    type: "widget",
    rowId: data.rowId,
    widgetId: data.widgetId,
    position: data.position,
  };
}

function createCollisionDetection(): CollisionDetection {
  return (args) => {
    const collisions = pointerWithin(args);

    return collisions.sort((first, second) => {
      const firstPriority = getZonePriority(first.data?.current as DropZoneData | undefined);
      const secondPriority = getZonePriority(second.data?.current as DropZoneData | undefined);
      return secondPriority - firstPriority;
    });
  };
}

type RowDropZoneProps = Readonly<{
  row: DashboardRow;
  active: boolean;
  children: React.ReactNode;
}>;

function RowDropZone({ row, active, children }: RowDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `row:${row.id}`,
    data: {
      type: "row",
      rowId: row.id,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="rounded-2xl transition data-[active=true]:shadow-[0_0_24px_rgba(34,211,238,0.12)] data-[active=true]:ring-1 data-[active=true]:ring-cyan-400/25"
      data-menace-drop-zone="row"
      data-row-id={row.id}
      data-active={active || isOver ? "true" : "false"}
    >
      {children}
    </div>
  );
}

function NewRowDropZone({ active }: Readonly<{ active: boolean }>) {
  const { setNodeRef, isOver } = useDroppable({
    id: "new-row",
    data: {
      type: "new-row",
    },
  });

  return (
    <div
      ref={setNodeRef}
      className="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4 text-center text-sm text-slate-400 transition data-[active=true]:border-cyan-400/35 data-[active=true]:bg-cyan-400/10 data-[active=true]:text-cyan-100"
      data-menace-drop-zone="new-row"
      data-active={active || isOver ? "true" : "false"}
    >
      Drop here to create a new row
    </div>
  );
}

function getWidgetById(widgets: DashboardWidget[], widgetId: string | null) {
  if (!widgetId) {
    return null;
  }

  return widgets.find((widget) => widget.id === widgetId) ?? null;
}

function GhostOverlay({
  widget,
  quests,
  size,
}: Readonly<{
  widget: DashboardWidget;
  quests: DailyQuest[];
  size: DragSize | null;
}>) {
  return (
    <div
      className="pointer-events-none opacity-85 shadow-[0_0_45px_rgba(168,85,247,0.28)]"
      style={{
        width: size?.width ?? "min(92vw, 48rem)",
        height: size?.height ?? "auto",
      }}
    >
      <DashboardWidgetRenderer widget={widget} quests={quests} />
    </div>
  );
}

export default function DashboardPageClient() {
  const [isEditing, setIsEditing] = useState(false);
  const [isCatalogOpen, setIsCatalogOpen] = useState(false);
  const [settingsWidget, setSettingsWidget] = useState<DashboardWidget | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [currentDropIntent, setCurrentDropIntent] = useState<WidgetDropIntent | null>(null);
  const [previewLayout, setPreviewLayout] = useState<DashboardGridLayout | null>(null);
  const [dragSize, setDragSize] = useState<DragSize | null>(null);
  const [layout, setLayout, , resetLayout] = useLocalStorageState<DashboardLayout>(STORAGE_KEYS.dashboardLayout, createDefaultDashboardLayout());
  const [gridLayout, setGridLayout, , resetGridLayout] = useLocalStorageState<DashboardGridLayout>(STORAGE_KEYS.dashboardGridLayout, createDefaultDashboardGridLayout());
  const { questDefinitions } = useProgression();
  const { attributes: categories } = useAttributes();
  const [isEntranceActive, setIsEntranceActive] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setIsEntranceActive(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  const savedGridRef = useRef<DashboardGridLayout>(gridLayout);
  const widgetsRef = useRef<DashboardWidget[]>(layout.widgets);
  const previewLayoutRef = useRef<DashboardGridLayout | null>(null);
  const lastPreviewSignatureRef = useRef<string | null>(null);
  const lastIntentSignatureRef = useRef<string>("");
  const activeDragIdRef = useRef<string | null>(null);
  const duplicateWidgetCounterRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
  );

  const normalizedWidgets = useMemo(() => layout.widgets.map((widget) => normalizeWidget(widget)), [layout.widgets]);

  const dashboardCatalogWidgets = useMemo(() => [...dashboardNativeCatalogWidgets, ...getCatalogWidgetsForPage("dashboard")], []);

  const normalizedLayout = useMemo(
    () => ({
      ...layout,
      layoutVersion: layout.layoutVersion ?? WIDGET_LAYOUT_VERSION,
      widgets: normalizedWidgets,
    }),
    [layout, normalizedWidgets],
  );

  const normalizedSavedGrid = useMemo(
    () =>
      reconcileGrid(
        gridLayout.rows.length > 0
          ? { ...gridLayout, layoutVersion: gridLayout.layoutVersion ?? WIDGET_LAYOUT_VERSION }
          : createFallbackGrid(normalizedWidgets),
        normalizedWidgets,
      ),
    [gridLayout, normalizedWidgets],
  );

  useEffect(() => {
    savedGridRef.current = normalizedSavedGrid;
  }, [normalizedSavedGrid]);

  useEffect(() => {
    widgetsRef.current = normalizedWidgets;
  }, [normalizedWidgets]);

  useEffect(() => {
    previewLayoutRef.current = previewLayout;
  }, [previewLayout]);

  useEffect(() => {
    activeDragIdRef.current = activeDragId;
  }, [activeDragId]);

  useEffect(() => {
    if (layout.layoutVersion !== WIDGET_LAYOUT_VERSION || layout.widgets.some((widget) => !widget.settings)) {
      setLayout(normalizedLayout);
    }
  }, [layout.layoutVersion, layout.widgets, normalizedLayout, setLayout]);

  useEffect(() => {
    if (gridLayout.layoutVersion !== WIDGET_LAYOUT_VERSION) {
      setGridLayout({
        ...normalizedSavedGrid,
        layoutVersion: WIDGET_LAYOUT_VERSION,
      });
    }
  }, [gridLayout.layoutVersion, normalizedSavedGrid, setGridLayout]);

  const activeDailyQuests = useMemo(() => {
    return getTodayQuests(questDefinitions).map(toDailyQuest);
  }, [questDefinitions]);

  const widgetsById = useMemo(() => new Map(normalizedWidgets.map((widget) => [widget.id, widget])), [normalizedWidgets]);

  const savedGrid = useMemo(() => normalizedSavedGrid, [normalizedSavedGrid]);

  const visibleGridLayout = useMemo(() => reconcileGrid(previewLayout ?? savedGrid, normalizedWidgets), [normalizedWidgets, previewLayout, savedGrid]);

  const activeWidget = useMemo(() => getWidgetById(normalizedWidgets, activeDragId), [activeDragId, normalizedWidgets]);

  function updateWidgets(updater: (widgets: DashboardWidget[]) => DashboardWidget[]) {
    setLayout((current) => ({
      ...current,
      layoutVersion: WIDGET_LAYOUT_VERSION,
      widgets: normalizeOrder(updater(orderByPosition(current.widgets).map((widget) => normalizeWidget(widget)))),
      updatedAt: new Date().toISOString(),
    }));
  }

  function commitGridLayout(nextLayout: DashboardGridLayout) {
    setGridLayout(
      materializeGridLayout(
        {
          ...nextLayout,
          layoutVersion: WIDGET_LAYOUT_VERSION,
          rows: cleanRows(cloneRows(nextLayout.rows)),
          updatedAt: new Date().toISOString(),
        },
        widgetsRef.current,
      ),
    );
  }

  function clearDragState() {
    setActiveDragId(null);
    setCurrentDropIntent(null);
    setPreviewLayout(null);
    setDragSize(null);
    previewLayoutRef.current = null;
    lastPreviewSignatureRef.current = null;
    lastIntentSignatureRef.current = "";
  }

  function buildPreview(intent: WidgetDropIntent | null) {
    if (!intent || !activeDragIdRef.current) {
      setCurrentDropIntent(null);
      setPreviewLayout(null);
      lastPreviewSignatureRef.current = null;
      lastIntentSignatureRef.current = "";
      return;
    }

    const nextPreview = buildPreviewLayout(savedGridRef.current, activeDragIdRef.current, intent, widgetsRef.current);
    const nextPreviewSignature = nextPreview.rows.map((row) => `${row.id}:${row.widgetIds.join(",")}`).join("|");
    const nextIntentSignature =
      intent.type === "new-row"
        ? "new-row"
        : intent.type === "row"
          ? `row:${intent.rowId}`
          : `widget:${intent.rowId}:${intent.widgetId}:${intent.position}`;

    if (lastPreviewSignatureRef.current === nextPreviewSignature && lastIntentSignatureRef.current === nextIntentSignature) {
      return;
    }

    lastPreviewSignatureRef.current = nextPreviewSignature;
    lastIntentSignatureRef.current = nextIntentSignature;
    previewLayoutRef.current = nextPreview;
    setCurrentDropIntent(intent);
    setPreviewLayout(nextPreview);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragId(String(event.active.id));
    setCurrentDropIntent(null);
    setPreviewLayout(null);
    lastPreviewSignatureRef.current = null;
    lastIntentSignatureRef.current = "";

    const rect = event.active.rect.current.initial;
    if (rect) {
      setDragSize({ width: rect.width, height: rect.height });
    }
  }

  function handleDragOver(event: DragOverEvent) {
    buildPreview(parseDropIntent(event.over));
  }

  function handleDragEnd(event: DragEndEvent) {
    const nextLayout = previewLayoutRef.current;

    if (nextLayout) {
      commitGridLayout(nextLayout);
    }

    void event;
    clearDragState();
  }

  function handleDragCancel(event: DragCancelEvent) {
    void event;
    clearDragState();
  }

  function saveWidget(nextWidget: DashboardWidget) {
    updateWidgets((widgets) => widgets.map((widget) => (widget.id === nextWidget.id ? nextWidget : widget)));
    setSettingsWidget(null);
  }

  function toggleWidgetVisibility(widgetId: string) {
    const target = widgetsRef.current.find((widget) => widget.id === widgetId);

    if (!target || (getWidgetDefinition(target.type)?.canHide ?? true) === false) {
      return;
    }

    updateWidgets((widgets) => toggleItemVisibility(widgets, widgetId));
  }

  function duplicateWidget(widget: DashboardWidget) {
    if ((getWidgetDefinition(widget.type)?.canDuplicate ?? true) === false) {
      return;
    }

    duplicateWidgetCounterRef.current += 1;
    const cloneId = `${widget.id}-copy-${duplicateWidgetCounterRef.current}`;
    const nextWidgets = duplicateItemAfter(widgetsRef.current, widget.id, () => cloneId);

    setLayout((current) => ({
      ...current,
      layoutVersion: WIDGET_LAYOUT_VERSION,
      widgets: normalizeOrder(nextWidgets.map((item) => normalizeWidget(item))),
      updatedAt: new Date().toISOString(),
    }));

    setGridLayout((current) => {
      const source = current.rows.length > 0 ? current : createFallbackGrid(nextWidgets);
      const nextRows = cloneRows(source.rows);
      const position = nextRows.findIndex((row) => row.widgetIds.includes(widget.id));

      if (position < 0) {
        return {
          ...reconcileGrid({ ...current, rows: nextRows, layoutVersion: current.layoutVersion ?? WIDGET_LAYOUT_VERSION }, nextWidgets),
          layoutVersion: WIDGET_LAYOUT_VERSION,
          updatedAt: new Date().toISOString(),
        };
      }

      const targetRow = nextRows[position];
      const widgetIndex = targetRow.widgetIds.indexOf(widget.id);
      const nextWidgetIds = [...targetRow.widgetIds];
      nextWidgetIds.splice(widgetIndex + 1, 0, cloneId);
      nextRows[position] = { ...targetRow, widgetIds: nextWidgetIds };

      return {
        ...reconcileGrid({ ...current, rows: nextRows, layoutVersion: current.layoutVersion ?? WIDGET_LAYOUT_VERSION }, nextWidgets),
        layoutVersion: WIDGET_LAYOUT_VERSION,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function deleteWidget(widgetId: string) {
    const target = widgetsRef.current.find((widget) => widget.id === widgetId);

    if (!target || (getWidgetDefinition(target.type)?.canDelete ?? true) === false) {
      return;
    }

    const nextWidgets = removeItemById(widgetsRef.current, widgetId);

    setLayout((current) => ({
      ...current,
      layoutVersion: WIDGET_LAYOUT_VERSION,
      widgets: normalizeOrder(nextWidgets.map((widget) => normalizeWidget(widget))),
      updatedAt: new Date().toISOString(),
    }));

    setGridLayout((current) => {
      const nextRows = removeWidgetFromRows(current.rows, widgetId);

      return {
        ...reconcileGrid({ ...current, rows: nextRows, layoutVersion: current.layoutVersion ?? WIDGET_LAYOUT_VERSION }, nextWidgets),
        layoutVersion: WIDGET_LAYOUT_VERSION,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function addWidget(widgetType: DashboardWidget["type"]) {
    const definition = getWidgetDefinition(widgetType);
    const catalogWidget = definition ? null : getCatalogWidget(widgetType);

    if (!definition && !catalogWidget) {
      return;
    }

    const newWidgetId = `${widgetType}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const nextWidget = createWidgetFromType(widgetType, {
      id: newWidgetId,
      visible: true,
      order: (widgetsRef.current.length + 1) * 10,
    });

    if (!nextWidget) {
      return;
    }

    const nextWidgets = [...widgetsRef.current, nextWidget];

    setLayout((current) => ({
      ...current,
      layoutVersion: WIDGET_LAYOUT_VERSION,
      widgets: normalizeOrder(nextWidgets.map((widget) => normalizeWidget(widget))),
      updatedAt: new Date().toISOString(),
    }));

    // Catalog widgets have no natural row grouping (unlike built-in widgets,
    // which declare a `defaultRow`), so each one starts in its own new row.
    const defaultRow = definition?.defaultRow ?? `row-${newWidgetId}`;

    setGridLayout((current) => {
      const nextRows = cloneRows(current.rows.length > 0 ? current.rows : createFallbackGrid(nextWidgets).rows);
      const targetRowIndex = nextRows.findIndex((row) => row.id === defaultRow);

      if (targetRowIndex >= 0) {
        nextRows[targetRowIndex] = { ...nextRows[targetRowIndex], widgetIds: [...nextRows[targetRowIndex].widgetIds, newWidgetId] };
      } else {
        nextRows.push({ id: defaultRow, widgetIds: [newWidgetId] });
      }

      return {
        ...reconcileGrid({ ...current, rows: nextRows, layoutVersion: current.layoutVersion ?? WIDGET_LAYOUT_VERSION }, nextWidgets),
        layoutVersion: WIDGET_LAYOUT_VERSION,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function resetAllLayout() {
    if (!window.confirm("Reset MENACE dashboard layout to defaults?")) {
      return;
    }

    resetLayout();
    resetGridLayout();
    setLayout(createDefaultDashboardLayout());
    setGridLayout(createDefaultDashboardGridLayout());
    clearDragState();
    setIsCatalogOpen(false);
  }

  function renderDashboardWidget(widget: DashboardWidget, rowId: string) {
    const definition = getWidgetDefinition(widget.type);

    return (
      <SortableWidgetFrame
        key={widget.id}
        rowId={rowId}
        widget={widget}
        isEditing={isEditing}
        isGhost={activeDragId === widget.id}
        activeDropIntent={currentDropIntent}
        canHide={definition?.canHide ?? true}
        canDuplicate={definition?.canDuplicate ?? true}
        canDelete={definition?.canDelete ?? true}
        onHide={() => toggleWidgetVisibility(widget.id)}
        onSettings={() => setSettingsWidget(widget)}
        onDuplicate={() => duplicateWidget(widget)}
        onDelete={() => deleteWidget(widget.id)}
      >
        <DashboardWidgetRenderer widget={widget} quests={activeDailyQuests} onEnterEditMode={() => setIsEditing(true)} />
      </SortableWidgetFrame>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-purple-500/20 bg-slate-950/45 p-4 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Dashboard System</p>
          <h1 className="mt-1 text-2xl font-black text-white">MENACE Command Center</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {isEditing ? (
            <button type="button" onClick={resetAllLayout} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-purple-400/60 hover:text-white">
              Reset Layout
            </button>
          ) : null}
          {isEditing ? (
            <button
              type="button"
              onClick={() => setIsCatalogOpen(true)}
              className="rounded-xl border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
            >
              Add Widget
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setIsEditing((current) => !current)}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            {isEditing ? "Done Editing" : "Edit Dashboard"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 text-sm text-cyan-100">
          Edit mode is active. Drag a widget by its handle to preview the final placement before release.
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={createCollisionDetection()}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="space-y-6">
          {visibleGridLayout.rows.map((row, rowIndex) => {
            const rowWidgets = row.widgetIds
              .map((widgetId) => widgetsById.get(widgetId))
              .filter((widget): widget is DashboardWidget => Boolean(widget))
              .filter((widget) => isEditing || widget.visible);

            if (rowWidgets.length === 0) {
              return null;
            }

            return (
              <RowDropZone key={row.id} row={row} active={currentDropIntent?.type === "row" && currentDropIntent.rowId === row.id}>
                <div
                  className={"dashboard-row grid min-w-0 grid-cols-1 gap-6 md:[grid-template-columns:var(--dashboard-row-columns)] " + (isEntranceActive ? "dashboard-row-enter" : "")}
                  style={
                    {
                      "--dashboard-row-columns": `repeat(${rowWidgets.length}, minmax(0, 1fr))`,
                      ...(isEntranceActive ? { animationDelay: `${Math.min(rowIndex, 5) * 90}ms` } : {}),
                    } as CSSProperties
                  }
                >
                  {rowWidgets.map((widget) => renderDashboardWidget(widget, row.id))}
                </div>
              </RowDropZone>
            );
          })}
        </div>

        {isEditing ? <NewRowDropZone active={currentDropIntent?.type === "new-row"} /> : null}

        <DragOverlay dropAnimation={null} adjustScale={false}>
          {activeWidget ? <GhostOverlay widget={activeWidget} quests={activeDailyQuests} size={dragSize} /> : null}
        </DragOverlay>
      </DndContext>

      {settingsWidget ? <WidgetSettingsModal widget={settingsWidget} categories={categories} onClose={() => setSettingsWidget(null)} onSave={saveWidget} /> : null}
      {isCatalogOpen ? (
        <WidgetCatalogModal
          widgets={dashboardCatalogWidgets}
          alreadyAddedIds={new Set(normalizedWidgets.map((widget) => widget.type))}
          onAdd={(widget) => {
            addWidget(widget.id);
            setIsCatalogOpen(false);
          }}
          onClose={() => setIsCatalogOpen(false)}
        />
      ) : null}
    </div>
  );
}
