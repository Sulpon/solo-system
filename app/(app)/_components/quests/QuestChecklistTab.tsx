"use client";

import { useState } from "react";
import { DndContext, DragOverlay, PointerSensor, pointerWithin, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import { useCombinedRefs } from "@dnd-kit/utilities";
import { useChecklistTemplates } from "../../_lib/hooks/useChecklistTemplates";
import { createChecklistItem, generateChecklistId, getChecklistCompletionState, getChecklistProgress, moveChecklistItem } from "../../_lib/engines/checklist-engine";
import type { ChecklistItem, ChecklistMode, ChecklistTier, Quest } from "../../_lib/types/quest";
import type { ChecklistTemplate } from "../../_lib/types/checklist-template";

type QuestChecklistTabProps = Readonly<{
  quest: Quest;
  onUpdate: (questId: string, patch: Readonly<{ checklistMode?: ChecklistMode; checklist?: ReadonlyArray<ChecklistItem>; checklistTemplateId?: string | null }>) => void;
}>;

const labelClass = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";
const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-sm text-white outline-none transition focus:border-purple-400";

const ITEM_ZONE_PREFIX = "checklist-item-";
const END_ZONE_ID: Record<ChecklistTier, string> = { minimum: "checklist-end-minimum", full: "checklist-end-full" };

const TIER_META: Record<ChecklistTier, { label: string; addHint: string; accentText: string; accentBorder: string }> = {
  minimum: { label: "Minimum Success", addHint: "Add a Minimum Success item", accentText: "text-emerald-200", accentBorder: "border-emerald-400/60" },
  full: { label: "Full Completion", addHint: "Add a Full Completion item", accentText: "text-purple-200", accentBorder: "border-purple-400/60" },
};

const MODE_META: ReadonlyArray<{ id: ChecklistMode; label: string; description: string }> = [
  { id: "none", label: "None", description: "No checklist for this Quest." },
  { id: "fixed", label: "Fixed", description: "These checklist items come from a reusable structure." },
  { id: "modifiable", label: "Modifiable", description: "This checklist is created specifically for this Quest." },
];

function GripIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
      <circle cx="7" cy="4.5" r="1.4" />
      <circle cx="13" cy="4.5" r="1.4" />
      <circle cx="7" cy="10" r="1.4" />
      <circle cx="13" cy="10" r="1.4" />
      <circle cx="7" cy="15.5" r="1.4" />
      <circle cx="13" cy="15.5" r="1.4" />
    </svg>
  );
}

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5">
      <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type ChecklistItemRowProps = Readonly<{
  item: ChecklistItem;
  onToggle: (itemId: string) => void;
  onEditTitle: (itemId: string, title: string) => void;
  onDelete: (itemId: string) => void;
  onMoveTier: (itemId: string, tier: ChecklistTier) => void;
}>;

function ChecklistItemRow({ item, onToggle, onEditTitle, onDelete, onMoveTier }: ChecklistItemRowProps) {
  const zoneId = ITEM_ZONE_PREFIX + item.id;
  const { attributes, listeners, setNodeRef: setDragRef, setActivatorNodeRef, isDragging } = useDraggable({ id: zoneId });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: zoneId });
  const setNodeRef = useCombinedRefs(setDragRef, setDropRef);
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(item.title);
  const otherTier: ChecklistTier = item.tier === "minimum" ? "full" : "minimum";

  function startEdit() {
    setDraftTitle(item.title);
    setIsEditing(true);
  }

  function commitEdit() {
    const trimmed = draftTitle.trim();

    if (trimmed && trimmed !== item.title) {
      onEditTitle(item.id, trimmed);
    }

    setIsEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      data-testid={zoneId}
      className={
        "flex items-center gap-2 rounded-lg border px-2 py-1.5 transition duration-150 " +
        (isDragging ? "opacity-40 " : "") +
        (isOver ? "border-purple-400/60 bg-slate-900/70" : "border-slate-800 bg-slate-950/40")
      }
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...listeners}
        {...attributes}
        aria-label={"Drag " + item.title}
        className="flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center text-slate-600 transition hover:text-slate-300 active:cursor-grabbing"
      >
        <GripIcon />
      </button>

      <button
        type="button"
        onClick={() => onToggle(item.id)}
        aria-label={item.completed ? "Mark incomplete" : "Mark complete"}
        className={
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition " +
          (item.completed ? "border-emerald-400 bg-emerald-500/20 text-emerald-200" : "border-slate-600 text-transparent hover:border-slate-400")
        }
      >
        <CheckmarkIcon />
      </button>

      {isEditing ? (
        <input
          autoFocus
          value={draftTitle}
          onChange={(event) => setDraftTitle(event.target.value)}
          onBlur={commitEdit}
          onKeyDown={(event) => {
            if (event.key === "Enter") commitEdit();
            if (event.key === "Escape") setIsEditing(false);
          }}
          className={inputClass + " flex-1"}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className={"flex-1 truncate text-left text-sm transition hover:text-white " + (item.completed ? "text-slate-500 line-through" : "text-slate-200")}
        >
          {item.title}
        </button>
      )}

      <button
        type="button"
        onClick={() => onMoveTier(item.id, otherTier)}
        title={`Move to ${TIER_META[otherTier].label}`}
        className="shrink-0 rounded-md px-1.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500 transition hover:bg-slate-800/60 hover:text-white"
      >
        {item.tier === "minimum" ? "→ Full" : "← Min"}
      </button>

      <button
        type="button"
        onClick={() => onDelete(item.id)}
        aria-label={"Delete " + item.title}
        className="shrink-0 rounded-md px-1.5 py-1 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-300"
      >
        ✕
      </button>
    </div>
  );
}

function EndDropZone({ tier }: Readonly<{ tier: ChecklistTier }>) {
  const { setNodeRef, isOver } = useDroppable({ id: END_ZONE_ID[tier] });

  return <div ref={setNodeRef} data-testid={END_ZONE_ID[tier]} className={"h-2 rounded-full transition " + (isOver ? "h-3 bg-purple-400/50" : "bg-transparent")} />;
}

function AddItemRow({ tier, onAdd }: Readonly<{ tier: ChecklistTier; onAdd: (tier: ChecklistTier, title: string) => void }>) {
  const [title, setTitle] = useState("");

  function submit() {
    if (!title.trim()) {
      return;
    }

    onAdd(tier, title);
    setTitle("");
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") submit();
        }}
        placeholder={TIER_META[tier].addHint}
        className={inputClass}
      />
      <button type="button" onClick={submit} className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-purple-400/60 hover:text-white">
        + Add
      </button>
    </div>
  );
}

export default function QuestChecklistTab({ quest, onUpdate }: QuestChecklistTabProps) {
  const { templates, setTemplates } = useChecklistTemplates();
  const [activeDragZoneId, setActiveDragZoneId] = useState<string | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const dragSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const mode = quest.checklistMode ?? "none";
  const checklist = quest.checklist ?? [];
  const minimumItems = checklist.filter((item) => item.tier === "minimum");
  const fullItems = checklist.filter((item) => item.tier === "full");
  const progress = getChecklistProgress(checklist);
  const completionState = getChecklistCompletionState(progress);
  const activeDragItem = activeDragZoneId ? checklist.find((item) => ITEM_ZONE_PREFIX + item.id === activeDragZoneId) : undefined;
  const linkedTemplate = quest.checklistTemplateId ? templates.find((template) => template.id === quest.checklistTemplateId) : undefined;

  function setMode(nextMode: ChecklistMode) {
    onUpdate(quest.id, { checklistMode: nextMode });
  }

  function toggleItem(itemId: string) {
    onUpdate(quest.id, { checklist: checklist.map((item) => (item.id === itemId ? { ...item, completed: !item.completed } : item)) });
  }

  function editItemTitle(itemId: string, title: string) {
    onUpdate(quest.id, { checklist: checklist.map((item) => (item.id === itemId ? { ...item, title } : item)) });
  }

  function deleteItem(itemId: string) {
    onUpdate(quest.id, { checklist: checklist.filter((item) => item.id !== itemId) });
  }

  function addItem(tier: ChecklistTier, title: string) {
    onUpdate(quest.id, { checklist: [...checklist, createChecklistItem(title, tier)] });
  }

  function moveItemToTier(itemId: string, tier: ChecklistTier) {
    onUpdate(quest.id, { checklist: moveChecklistItem(checklist, itemId, tier, Number.POSITIVE_INFINITY) });
  }

  function applyTemplate(templateId: string) {
    const template = templates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    const copiedItems = template.items.map((item) => ({ ...item, id: generateChecklistId(), completed: false }));
    onUpdate(quest.id, { checklist: copiedItems, checklistTemplateId: template.id });
    setSelectedTemplateId("");
  }

  function saveAsNewTemplate() {
    const title = newTemplateName.trim();

    if (!title || checklist.length === 0) {
      return;
    }

    const now = new Date().toISOString();
    const template: ChecklistTemplate = {
      id: generateChecklistId(),
      title,
      items: checklist.map((item) => ({ ...item, completed: false })),
      createdAt: now,
      updatedAt: now,
    };

    setTemplates((current) => [...current, template]);
    onUpdate(quest.id, { checklistTemplateId: template.id });
    setNewTemplateName("");
  }

  function updateLinkedTemplate() {
    if (!quest.checklistTemplateId) {
      return;
    }

    const now = new Date().toISOString();
    setTemplates((current) =>
      current.map((template) =>
        template.id === quest.checklistTemplateId ? { ...template, items: checklist.map((item) => ({ ...item, completed: false })), updatedAt: now } : template,
      ),
    );
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveDragZoneId(String(event.active.id));
  }

  function handleDragCancel() {
    setActiveDragZoneId(null);
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeZoneId = String(event.active.id);
    const overZoneId = event.over?.id ? String(event.over.id) : null;
    setActiveDragZoneId(null);

    if (!overZoneId || overZoneId === activeZoneId || !activeZoneId.startsWith(ITEM_ZONE_PREFIX)) {
      return;
    }

    const itemId = activeZoneId.slice(ITEM_ZONE_PREFIX.length);
    let targetTier: ChecklistTier;
    let targetIndex: number;

    if (overZoneId === END_ZONE_ID.minimum || overZoneId === END_ZONE_ID.full) {
      targetTier = overZoneId === END_ZONE_ID.minimum ? "minimum" : "full";
      targetIndex = Number.POSITIVE_INFINITY;
    } else if (overZoneId.startsWith(ITEM_ZONE_PREFIX)) {
      const overItemId = overZoneId.slice(ITEM_ZONE_PREFIX.length);
      const overItem = checklist.find((item) => item.id === overItemId);

      if (!overItem) {
        return;
      }

      targetTier = overItem.tier;
      const tierList = checklist.filter((item) => item.tier === targetTier && item.id !== itemId);
      const overIndexInTier = tierList.findIndex((item) => item.id === overItemId);

      if (overIndexInTier === -1) {
        return;
      }

      // Insert before/after the hovered item depending on which half of its
      // rect the pointer ended up in - this is what lets a drop land at the
      // exact position the user chose, not just "somewhere near this item."
      const overRect = event.over?.rect;
      const activatorEvent = event.activatorEvent as Partial<{ clientY: number }>;
      const pointerY = (activatorEvent.clientY ?? 0) + event.delta.y;
      const droppedAfter = overRect ? pointerY > overRect.top + overRect.height / 2 : false;
      targetIndex = overIndexInTier + (droppedAfter ? 1 : 0);
    } else {
      return;
    }

    onUpdate(quest.id, { checklist: moveChecklistItem(checklist, itemId, targetTier, targetIndex) });
  }

  return (
    <div className="space-y-5">
      <div>
        <p className={labelClass}>Checklist</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {MODE_META.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setMode(option.id)}
              className={
                "rounded-xl border px-3 py-2 text-sm font-semibold transition " +
                (mode === option.id ? "border-purple-400/60 bg-purple-500/15 text-purple-100" : "border-slate-700 bg-slate-950/60 text-slate-400 hover:border-purple-400/40 hover:text-white")
              }
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{MODE_META.find((option) => option.id === mode)?.description}</p>
      </div>

      {mode === "none" ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/45 p-6 text-center">
          <p className="text-sm font-semibold text-white">No checklist for this Quest</p>
          <p className="mt-1.5 text-xs text-slate-500">Switch to Fixed or Modifiable above to add one.</p>
        </div>
      ) : (
        <>
          {mode === "fixed" ? (
            <div className="space-y-3 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">Template</p>
                <p className="mt-1 text-xs text-slate-400">
                  {linkedTemplate ? `Linked to "${linkedTemplate.title}" - editing items below only changes this Quest.` : "Not linked to a reusable template yet."}
                </p>
              </div>

              {templates.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2">
                  <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className={inputClass + " max-w-xs"}>
                    <option value="">Choose a template...</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => applyTemplate(selectedTemplateId)}
                    disabled={!selectedTemplateId}
                    className="shrink-0 rounded-lg border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Apply
                  </button>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <input value={newTemplateName} onChange={(event) => setNewTemplateName(event.target.value)} placeholder="New template name" className={inputClass + " max-w-xs"} />
                <button type="button" onClick={saveAsNewTemplate} className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-white">
                  Save as Template
                </button>
                {linkedTemplate ? (
                  <button type="button" onClick={updateLinkedTemplate} className="shrink-0 rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400/40 hover:text-white">
                    Update &ldquo;{linkedTemplate.title}&rdquo;
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <DndContext sensors={dragSensors} collisionDetection={pointerWithin} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
            <div className="space-y-4">
              {(["minimum", "full"] as const).map((tier) => (
                <div key={tier}>
                  <div className="flex items-center gap-2 px-1">
                    <span className={"text-xs font-black uppercase tracking-[0.14em] " + TIER_META[tier].accentText}>{TIER_META[tier].label}</span>
                    <span className="text-xs text-slate-500">{tier === "minimum" ? `${progress.minimumCompleted} / ${progress.minimumTotal}` : `${progress.fullCompleted} / ${progress.fullTotal}`}</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    {(tier === "minimum" ? minimumItems : fullItems).map((item) => (
                      <ChecklistItemRow key={item.id} item={item} onToggle={toggleItem} onEditTitle={editItemTitle} onDelete={deleteItem} onMoveTier={moveItemToTier} />
                    ))}
                    <EndDropZone tier={tier} />
                  </div>
                  <div className="mt-2">
                    <AddItemRow tier={tier} onAdd={addItem} />
                  </div>
                </div>
              ))}
            </div>

            <DragOverlay dropAnimation={null}>
              {activeDragItem ? (
                <div className="flex max-w-xs items-center gap-2 rounded-lg border border-purple-400/60 bg-slate-900 px-3 py-1.5 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                  <span className="truncate text-sm text-white">{activeDragItem.title}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 text-xs text-slate-400">
            <p>
              Minimum Success: <span className="font-semibold text-emerald-200">{progress.minimumCompleted} / {progress.minimumTotal}</span>
              {" · "}
              Full Completion: <span className="font-semibold text-purple-200">{progress.fullCompleted} / {progress.fullTotal}</span>
            </p>
            <p className="mt-1 uppercase tracking-[0.14em] text-slate-500">
              Status: <span className="font-semibold text-slate-300">{completionState.replace(/_/g, " ")}</span>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
