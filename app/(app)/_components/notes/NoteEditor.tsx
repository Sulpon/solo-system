"use client";

import { useState } from "react";
import type { NoteDraft } from "../../_lib/hooks/useNotes";
import { NOTE_CATEGORIES } from "../../_lib/types/note";
import type { Note, NoteCategory } from "../../_lib/types/note";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500";

type NoteEditorProps = Readonly<{
  existingNote: Note | null;
  onSave: (draft: NoteDraft) => void;
  onCancel: () => void;
}>;

export default function NoteEditor({ existingNote, onSave, onCancel }: NoteEditorProps) {
  const [title, setTitle] = useState(existingNote?.title ?? "");
  const [content, setContent] = useState(existingNote?.content ?? "");
  const [category, setCategory] = useState<NoteCategory | "">(existingNote?.category ?? "");
  const [tagsInput, setTagsInput] = useState((existingNote?.tags ?? []).join(", "));

  function handleSave() {
    if (!content.trim()) {
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    onSave({
      title: title.trim(),
      content: content.trim(),
      category: category || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className={labelClass}>Title (optional)</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Untitled" className={inputClass} />
      </label>

      <label className="block space-y-2">
        <span className={labelClass}>Write</span>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={10}
          autoFocus
          placeholder="Start writing..."
          className="w-full resize-y rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2.5 text-sm leading-6 text-white outline-none transition focus:border-purple-400"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1.5">
          <span className={labelClass}>Category (optional)</span>
          <select value={category} onChange={(event) => setCategory(event.target.value as NoteCategory | "")} className={inputClass}>
            <option value="">No category</option>
            {NOTE_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5">
          <span className={labelClass}>Tags (optional)</span>
          <input value={tagsInput} onChange={(event) => setTagsInput(event.target.value)} placeholder="comma, separated, tags" className={inputClass} />
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:text-white">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!content.trim()}
          className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
}
