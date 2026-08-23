"use client";

import { useState } from "react";
import { getDaySummary } from "../../_lib/engines/chronicle-engine";
import { getLocalDayKey, parseLocalDayKey } from "../../_lib/local-day";
import { useDocumentPhotoUrl } from "../../_lib/hooks/useDocumentPhotoUrl";
import JournalEntryEditor from "./JournalEntryEditor";
import type { ChronicleContext } from "../../_lib/engines/chronicle-engine";
import type { DailyJournalEntry } from "../../_lib/types/journal";
import type { JournalEntryDraft } from "../../_lib/hooks/useJournalEntries";

type DayViewProps = Readonly<{
  date: string;
  context: ChronicleContext;
  journalEntry: DailyJournalEntry | null;
  onSelectDate: (date: string) => void;
  onSaveEntry: (date: string, draft: JournalEntryDraft) => void;
}>;

function formatDateLabel(date: string) {
  return parseLocalDayKey(date).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function shiftDate(date: string, deltaDays: number) {
  const next = parseLocalDayKey(date);
  next.setDate(next.getDate() + deltaDays);
  return getLocalDayKey(next);
}

function QuestStateIcon({ state }: { state: "completed" | "challenge-completed" | "missed" | "no-data" }) {
  if (state === "challenge-completed") {
    return (
      <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-emerald-300 bg-emerald-400/20 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.5)]">
        <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
          <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (state === "completed") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/10 text-emerald-300">
        <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
          <path d="M4 10.5 8 14.5 16 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  if (state === "missed") {
    return (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rose-500/50 bg-rose-500/10 text-rose-300">
        <svg viewBox="0 0 20 20" fill="none" className="h-3 w-3">
          <path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      </span>
    );
  }

  return <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900/60 text-slate-600">·</span>;
}

function PhotoThumbnail({ photoId, fileName }: { photoId: string; fileName: string }) {
  const url = useDocumentPhotoUrl(photoId);

  if (!url) {
    return <div className="flex h-56 w-full items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 text-xs text-slate-500">Photo not available on this device</div>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={fileName} className="max-h-[32rem] w-full rounded-xl border border-slate-800 bg-slate-950/40 object-contain" />;
}

export default function DayView({ date, context, journalEntry, onSelectDate, onSaveEntry }: DayViewProps) {
  const [editing, setEditing] = useState(false);
  const summary = getDaySummary(date, context);
  const todayKey = getLocalDayKey();

  function handleSave(draft: JournalEntryDraft) {
    onSaveEntry(date, draft);
    setEditing(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onSelectDate(shiftDate(date, -1))} aria-label="Previous day" className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            ‹
          </button>
          <h2 className="text-xl font-black text-white">{formatDateLabel(date)}</h2>
          <button type="button" onClick={() => onSelectDate(shiftDate(date, 1))} aria-label="Next day" disabled={summary.isFuture} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-300 transition hover:border-purple-400/60 hover:text-white disabled:cursor-not-allowed disabled:opacity-30">
            ›
          </button>
        </div>
        {date !== todayKey ? (
          <button type="button" onClick={() => onSelectDate(todayKey)} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition hover:border-purple-400/60 hover:text-white">
            Today
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Overview</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Level</p>
                <p className="text-lg font-bold text-white">{summary.level}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">XP Earned</p>
                <p className="text-lg font-bold text-purple-200">+{summary.xpEarned.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Quests</p>
                <p className="text-lg font-bold text-white">
                  {summary.questsCompletedCount}/{summary.questsScheduledCount}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Workout</p>
                <p className="text-lg font-bold text-white">{summary.workoutSessions.length > 0 ? `${summary.workoutSessions.length} logged` : "None"}</p>
              </div>
            </div>
          </div>

          {editing ? (
            <JournalEntryEditor dateLabel={formatDateLabel(date)} existingEntry={journalEntry} onSave={handleSave} onCancel={() => setEditing(false)} />
          ) : (
            <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">My Day</p>
                {journalEntry || summary.existingNarrative ? (
                  <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-purple-300 hover:text-purple-200">
                    Edit
                  </button>
                ) : null}
              </div>

              {journalEntry?.text ? (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{journalEntry.text}</p>
              ) : summary.existingNarrative ? (
                <>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{summary.existingNarrative}</p>
                  <p className="mt-2 text-[11px] text-slate-600">From your Night Review reflection.</p>
                </>
              ) : (
                <button type="button" onClick={() => setEditing(true)} className="mt-3 rounded-xl border border-dashed border-slate-700 px-4 py-6 text-sm text-slate-400 transition hover:border-purple-400/60 hover:text-white w-full text-center">
                  + Add memory
                </button>
              )}
            </div>
          )}

          {!editing ? (
            <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Today&rsquo;s Memory</p>
                <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-purple-300 hover:text-purple-200">
                  {journalEntry?.photos.length ? "Change Photo" : "Add Photo"}
                </button>
              </div>
              <div className="mt-3">
                {journalEntry?.photos.length ? (
                  <PhotoThumbnail photoId={journalEntry.photos[0].id} fileName={journalEntry.photos[0].fileName} />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-800 text-xs text-slate-600">No photo for this day</div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Today&rsquo;s Summary</p>
            {summary.questChecklist.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No scheduled quests existed on this day.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {summary.questChecklist.map((quest) => (
                  <li key={quest.questId} className="flex items-center gap-2.5 text-sm text-slate-200">
                    <QuestStateIcon state={quest.state} />
                    <span className={quest.state === "missed" ? "text-slate-500 line-through" : ""}>{quest.title}</span>
                    {quest.xpAwarded ? <span className="ml-auto text-xs font-semibold text-purple-300">+{quest.xpAwarded}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-purple-500/25 bg-slate-950/55 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Highlights</p>
            {summary.highlights.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing notable recorded for this day.</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {summary.highlights.map((highlight) => (
                  <li key={highlight.id} className="flex items-start gap-2.5 text-sm">
                    <span className="mt-0.5 shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300">{highlight.icon}</span>
                    <span>
                      <span className="text-slate-200">{highlight.title}</span>
                      {highlight.detail ? <span className="block text-xs text-slate-500">{highlight.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
