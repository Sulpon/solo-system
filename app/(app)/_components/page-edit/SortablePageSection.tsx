"use client";

import PageSectionEditOverlay from "./PageSectionEditOverlay";
import type { PageSectionLayoutItem, PageSectionSize } from "./types";

const sizeClassNames: Record<PageSectionSize, string> = {
  sm: "lg:col-span-3",
  md: "lg:col-span-4",
  lg: "lg:col-span-6",
  xl: "lg:col-span-12",
};

type SortablePageSectionProps = Readonly<{
  item: PageSectionLayoutItem;
  children: React.ReactNode;
  isEditing: boolean;
  isDragging: boolean;
  isDragTarget: boolean;
  onDragStart: (itemId: string) => void;
  onDragEnter: (itemId: string) => void;
  onDragEnd: () => void;
  onHide: () => void;
  onSettings: () => void;
  onDuplicate?: () => void;
  onDelete: () => void;
}>;

export default function SortablePageSection({
  item,
  children,
  isEditing,
  isDragging,
  isDragTarget,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onHide,
  onSettings,
  onDuplicate,
  onDelete,
}: SortablePageSectionProps) {
  return (
    <div className={"min-w-0 w-full " + sizeClassNames[item.size]}>
      <div
        onDragOver={(event) => {
          if (!isEditing) {
            return;
          }

          event.preventDefault();
          onDragEnter(item.id);
        }}
        onDrop={(event) => {
          event.preventDefault();
          onDragEnd();
        }}
        className={
          "relative rounded-2xl transition duration-200 " +
          (isEditing ? "border border-cyan-300/45 p-1 ring-1 ring-cyan-300/20 shadow-[0_0_28px_rgba(34,211,238,0.12)] " : "") +
          (isDragging ? "scale-[0.985] opacity-55 " : "") +
          (isDragTarget ? "border-purple-300/80 bg-purple-500/10 ring-purple-300/40 " : "") +
          (isEditing && !item.visible ? "opacity-50 " : "")
        }
      >
        {isEditing ? (
          <PageSectionEditOverlay
            title={item.title}
            visible={item.visible}
            onDragStart={() => onDragStart(item.id)}
            onDragEnd={onDragEnd}
            onHide={onHide}
            onSettings={onSettings}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />
        ) : null}
        <div className={isEditing ? "pt-14" : ""}>{children}</div>
      </div>
    </div>
  );
}
