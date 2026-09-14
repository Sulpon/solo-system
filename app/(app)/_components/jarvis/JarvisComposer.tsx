"use client";

import { useState, type FormEvent } from "react";
import { Send, Square, Trash2 } from "lucide-react";

type JarvisComposerProps = Readonly<{
  disabled: boolean;
  isSending: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
  onClear: () => void;
}>;

export default function JarvisComposer({ disabled, isSending, onSend, onStop, onClear }: JarvisComposerProps) {
  const [text, setText] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim() || disabled || isSending) return;
    onSend(text);
    setText("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-slate-800 p-3">
      <input
        type="text"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder={disabled ? "Atlas is unavailable" : "Ask Atlas..."}
        disabled={disabled || isSending}
        className="flex-1 rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none disabled:opacity-50"
      />
      {isSending ? (
        <button type="button" onClick={onStop} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-rose-400/40 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/20">
          <Square className="h-3.5 w-3.5" aria-hidden="true" /> Stop
        </button>
      ) : (
        <button type="submit" disabled={disabled || !text.trim()} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-cyan-400/40 bg-cyan-500/15 px-4 py-2.5 text-xs font-semibold text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-40">
          <Send className="h-3.5 w-3.5" aria-hidden="true" /> Send
        </button>
      )}
      <button type="button" onClick={onClear} aria-label="Clear conversation" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 text-slate-400 transition hover:border-slate-500 hover:text-white">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
      </button>
    </form>
  );
}
