"use client";

import type { ReactNode } from "react";
import { useDraggable, useDroppable, type DraggableSyntheticListeners } from "@dnd-kit/core";
import type { DashboardWidget, WidgetAccent } from "../../_lib/types/dashboard-widget";
import WidgetEditOverlay from "./WidgetEditOverlay";

const accentEditModeClasses: Record<WidgetAccent, string> = {
  purple: "border-purple-300/35 ring-purple-300/20 shadow-[0_0_28px_rgba(168,85,247,0.16)]",
  cyan: "border-cyan-300/35 ring-cyan-300/20 shadow-[0_0_28px_rgba(34,211,238,0.12)]",
  emerald: "border-emerald-300/35 ring-emerald-300/20 shadow-[0_0_28px_rgba(52,211,153,0.14)]",
  amber: "border-amber-300/35 ring-amber-300/20 shadow-[0_0_28px_rgba(252,211,77,0.14)]",
  rose: "border-rose-300/35 ring-rose-300/20 shadow-[0_0_28px_rgba(251,113,133,0.14)]",
  blue: "border-blue-300/35 ring-blue-300/20 shadow-[0_0_28px_rgba(96,165,250,0.14)]",
};

type WidgetDropIntent =
  | Readonly<{ type: "widget"; rowId: string; widgetId: string; position: "left" | "right" | "above" | "below" | "center" }>
  | Readonly<{ type: "row"; rowId: string }>
  | Readonly<{ type: "new-row" }>;

type SortableWidgetFrameProps = Readonly<{
  rowId: string;
  widget: DashboardWidget;
  children: ReactNode;
  isEditing: boolean;
  isGhost: boolean;
  activeDropIntent: WidgetDropIntent | null;
  canHide?: boolean;
  canDuplicate?: boolean;
  canDelete?: boolean;
  onHide: () => void;
  onSettings: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}>;

function GhostWidgetFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="widget-ghost-preview pointer-events-none relative min-w-0 h-full w-full max-w-full overflow-hidden rounded-2xl border border-dashed border-purple-300/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.86),rgba(88,28,135,0.2))] opacity-65 shadow-[0_0_35px_rgba(168,85,247,0.24)]">
      {children}
    </div>
  );
}

type DropZoneProps = Readonly<{
  id: string;
  rowId: string;
  widgetId: string;
  position: "left" | "right" | "above" | "below" | "center";
  className: string;
  active: boolean;
}>;

function WidgetDropZone({ id, rowId, widgetId, position, className, active }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: {
      type: "widget",
      rowId,
      widgetId,
      position,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={className}
      data-menace-drop-zone="widget"
      data-row-id={rowId}
      data-widget-id={widgetId}
      data-position={position}
      data-active={active || isOver ? "true" : "false"}
    />
  );
}

function ActiveWidgetFrame({
  rowId,
  widget,
  children,
  isEditing,
  isGhost,
  onHide,
  onSettings,
  onDuplicate,
  onDelete,
  activeDropIntent,
  canHide = true,
  canDuplicate = true,
  canDelete = true,
}: SortableWidgetFrameProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: widget.id,
    data: {
      type: "widget",
      widgetId: widget.id,
      rowId,
    },
  });
  const compactMode = widget.settings.compactMode;
  const transparency = Math.min(100, Math.max(0, widget.settings.transparency));
  const widgetOpacity = Math.max(0.45, 1 - transparency / 180);
  const showBorder = widget.settings.showBorder;
  const accentClasses = accentEditModeClasses[widget.settings.accentColor] ?? accentEditModeClasses.cyan;

  const dragHandleProps = {
    ...attributes,
    ...(listeners as DraggableSyntheticListeners),
  };

  return (
    <div
      ref={setNodeRef}
      className={
        "widget-frame relative min-w-0 h-full w-full max-w-full overflow-hidden rounded-2xl transition " +
        (isEditing && showBorder ? "border p-1 ring-1 " + accentClasses + " " : isEditing ? "p-1 " : "") +
        (isEditing && !widget.visible ? "opacity-50 " : "") +
        ((isDragging || isGhost) ? "widget-frame-dragging opacity-55 " : "")
      }
      style={{
        touchAction: "none",
        transition: isDragging ? "none" : undefined,
        willChange: isDragging ? "transform" : "auto",
        opacity: isDragging || isGhost ? undefined : widget.visible ? widgetOpacity : Math.min(widgetOpacity, 0.58),
      }}
    >
      {isEditing ? (
        <div className="absolute inset-0 z-10 grid grid-cols-3 grid-rows-[22%_1fr_22%] rounded-2xl pointer-events-none">
          <WidgetDropZone
            id={`widget:${widget.id}:above`}
            rowId={rowId}
            widgetId={widget.id}
            position="above"
            className="pointer-events-auto col-span-3 row-start-1 rounded-t-2xl bg-transparent transition data-[active=true]:bg-purple-500/10"
            active={activeDropIntent?.type === "widget" && activeDropIntent.rowId === rowId && activeDropIntent.widgetId === widget.id && activeDropIntent.position === "above"}
          />
          <WidgetDropZone
            id={`widget:${widget.id}:left`}
            rowId={rowId}
            widgetId={widget.id}
            position="left"
            className="pointer-events-auto col-start-1 row-start-2 rounded-l-2xl bg-transparent transition data-[active=true]:bg-cyan-400/10"
            active={activeDropIntent?.type === "widget" && activeDropIntent.rowId === rowId && activeDropIntent.widgetId === widget.id && activeDropIntent.position === "left"}
          />
          <WidgetDropZone
            id={`widget:${widget.id}:center`}
            rowId={rowId}
            widgetId={widget.id}
            position="center"
            className="pointer-events-auto col-start-2 row-start-2 bg-transparent transition data-[active=true]:bg-purple-500/10"
            active={false}
          />
          <WidgetDropZone
            id={`widget:${widget.id}:right`}
            rowId={rowId}
            widgetId={widget.id}
            position="right"
            className="pointer-events-auto col-start-3 row-start-2 rounded-r-2xl bg-transparent transition data-[active=true]:bg-cyan-400/10"
            active={activeDropIntent?.type === "widget" && activeDropIntent.rowId === rowId && activeDropIntent.widgetId === widget.id && activeDropIntent.position === "right"}
          />
          <WidgetDropZone
            id={`widget:${widget.id}:below`}
            rowId={rowId}
            widgetId={widget.id}
            position="below"
            className="pointer-events-auto col-span-3 row-start-3 rounded-b-2xl bg-transparent transition data-[active=true]:bg-purple-500/10"
            active={activeDropIntent?.type === "widget" && activeDropIntent.rowId === rowId && activeDropIntent.widgetId === widget.id && activeDropIntent.position === "below"}
          />
        </div>
      ) : null}

      {isEditing ? (
        <WidgetEditOverlay
          widget={widget}
          dragHandleProps={dragHandleProps}
          dragHandleRef={setActivatorNodeRef}
          canHide={canHide}
          canDuplicate={canDuplicate}
          canDelete={canDelete}
          onHide={onHide}
          onSettings={onSettings}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ) : null}

      <div className={"widget-content min-h-full min-w-0 " + (isEditing ? (compactMode ? "pt-16 sm:pt-10" : "pt-20 sm:pt-14") : "")}>{children}</div>
    </div>
  );
}

export default function SortableWidgetFrame({
  rowId,
  widget,
  children,
  isEditing,
  isGhost,
  activeDropIntent,
  canHide = true,
  canDuplicate = true,
  canDelete = true,
  onHide,
  onSettings,
  onDuplicate,
  onDelete,
}: SortableWidgetFrameProps) {
  if (isGhost) {
    return (
      <GhostWidgetFrame>
        <div className="widget-content min-h-full min-w-0 pt-20 sm:pt-14">{children}</div>
      </GhostWidgetFrame>
    );
  }

  return (
    <ActiveWidgetFrame
      rowId={rowId}
      widget={widget}
      isEditing={isEditing}
      isGhost={isGhost}
      activeDropIntent={activeDropIntent}
      canHide={canHide}
      canDuplicate={canDuplicate}
      canDelete={canDelete}
      onHide={onHide}
      onSettings={onSettings}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
    >
      {children}
    </ActiveWidgetFrame>
  );
}
