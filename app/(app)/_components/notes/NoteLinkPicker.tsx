"use client";

import { useMemo, useState } from "react";
import { flattenGoalTree } from "../../_lib/goal-tree-storage";
import { useGoalTree } from "../../_lib/hooks/useGoalTree";
import { useAttributes } from "../../_lib/hooks/useAttributes";
import { useProgression } from "../../_lib/hooks/useProgression";
import type { Note, NoteLink, NoteLinkEntityType } from "../../_lib/types/note";

type LinkableType = Extract<NoteLinkEntityType, "goal" | "quest" | "attribute" | "note">;

const TYPE_LABELS: Record<LinkableType, string> = {
  goal: "Goal",
  quest: "Quest",
  attribute: "Skill",
  note: "Note",
};

type NoteLinkPickerProps = Readonly<{
  note: Note;
  allNotes: ReadonlyArray<Note>;
  onAddLink: (link: Omit<NoteLink, "id">) => void;
  onRemoveLink: (linkId: string) => void;
}>;

// The first real reader/writer of Note.links (see types/note.ts) - Atlas OS
// Phase 4's Notes <-> Goal/Quest/Skill/Note relationship layer. Mirrors the
// existing Library linking pattern (LibraryLinkedGoals.tsx and siblings): a
// type-then-entity picker, a plain id reference stored on the Note, no
// second copy of the target entity's data.
export default function NoteLinkPicker({ note, allNotes, onAddLink, onRemoveLink }: NoteLinkPickerProps) {
  const { goalTree } = useGoalTree();
  const { attributes } = useAttributes();
  const { questDefinitions } = useProgression();
  const [picking, setPicking] = useState(false);
  const [pickType, setPickType] = useState<LinkableType>("goal");
  const [pickEntityId, setPickEntityId] = useState("");

  const flatGoals = useMemo(() => flattenGoalTree(goalTree), [goalTree]);

  const resolvedLinks = useMemo(
    () =>
      (note.links ?? [])
        .map((link) => {
          if (link.entityType === "goal") {
            const goal = flatGoals.find((node) => node.id === link.entityId);
            return goal ? { link, title: goal.title, typeLabel: "Goal" } : null;
          }
          if (link.entityType === "quest") {
            const quest = questDefinitions.find((item) => item.id === link.entityId);
            return quest ? { link, title: quest.title, typeLabel: "Quest" } : null;
          }
          if (link.entityType === "attribute") {
            const attribute = attributes.find((item) => item.id === link.entityId);
            return attribute ? { link, title: attribute.name, typeLabel: "Skill" } : null;
          }
          if (link.entityType === "note") {
            const linked = allNotes.find((item) => item.id === link.entityId);
            return linked ? { link, title: linked.title || "Untitled note", typeLabel: "Note" } : null;
          }
          return null;
        })
        .filter((entry): entry is { link: NoteLink; title: string; typeLabel: string } => Boolean(entry)),
    [note.links, flatGoals, questDefinitions, attributes, allNotes],
  );

  const optionsForType: ReadonlyArray<{ id: string; label: string }> =
    pickType === "goal"
      ? flatGoals.map((node) => ({ id: node.id, label: node.title }))
      : pickType === "quest"
        ? questDefinitions.map((quest) => ({ id: quest.id, label: quest.title }))
        : pickType === "attribute"
          ? attributes.map((attribute) => ({ id: attribute.id, label: attribute.name }))
          : allNotes.filter((item) => item.id !== note.id).map((item) => ({ id: item.id, label: item.title || "Untitled note" }));

  function confirmPick() {
    if (!pickEntityId) {
      return;
    }

    onAddLink({ entityType: pickType, entityId: pickEntityId });
    setPickEntityId("");
    setPicking(false);
  }

  return (
    <div className="border-t border-slate-800 pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Links</p>
        {!picking ? (
          <button type="button" onClick={() => setPicking(true)} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25">
            + Link
          </button>
        ) : null}
      </div>

      {picking ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={pickType}
            onChange={(event) => {
              setPickType(event.target.value as LinkableType);
              setPickEntityId("");
            }}
            className="rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400"
          >
            {(Object.keys(TYPE_LABELS) as LinkableType[]).map((type) => (
              <option key={type} value={type}>
                {TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select
            value={pickEntityId}
            onChange={(event) => setPickEntityId(event.target.value)}
            className="min-w-[160px] rounded-lg border border-slate-700 bg-slate-950/70 px-2.5 py-1.5 text-xs text-white outline-none transition focus:border-purple-400"
          >
            <option value="" disabled>
              Select {TYPE_LABELS[pickType].toLowerCase()}...
            </option>
            {optionsForType.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={confirmPick} disabled={!pickEntityId} className="rounded-lg border border-purple-400/50 bg-purple-500/15 px-3 py-1.5 text-xs font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40">
            Add
          </button>
          <button type="button" onClick={() => setPicking(false)} className="text-xs text-slate-500 transition hover:text-white">
            Cancel
          </button>
        </div>
      ) : null}

      {resolvedLinks.length === 0 && !picking ? <p className="mt-3 text-sm text-slate-500">No links yet.</p> : null}

      {resolvedLinks.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {resolvedLinks.map(({ link, title, typeLabel }) => (
            <div key={link.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <span className="mr-2 rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-slate-500">{typeLabel}</span>
                <span className="text-white">{title}</span>
              </span>
              <button type="button" onClick={() => onRemoveLink(link.id)} className="shrink-0 text-xs text-slate-500 transition hover:text-rose-300" aria-label={`Unlink ${title}`}>
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
