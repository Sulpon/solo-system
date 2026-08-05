"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../../Card";
import { useCoverLetterEntries } from "../../../_lib/hooks/useCoverLetterEntries";
import { createCoverLetterEntry } from "../../../_lib/types/cover-letter";
import AddCoverLetterModal from "./AddCoverLetterModal";

export default function CoverLetterListPageClient() {
  const router = useRouter();
  const { entries, setEntries, hasLoaded } = useCoverLetterEntries();
  const [showAddCoverLetter, setShowAddCoverLetter] = useState(false);

  if (!hasLoaded) {
    return null;
  }

  function createCoverLetter(fields: { company: string; position: string }) {
    const entry = { ...createCoverLetterEntry(fields.company), position: fields.position };
    setEntries((current) => [...current, entry]);
    setShowAddCoverLetter(false);
    router.push(`/career-hub/professional-profile/cover-letters/${entry.id}`);
  }

  function deleteCoverLetter(entryId: string) {
    setEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href="/career-hub/professional-profile"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← Professional Profile
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Professional Profile</p>
            <h1 className="mt-2 text-3xl font-black text-white">Cover Letters</h1>
            <p className="mt-2 text-sm text-slate-400">One entry per cover letter you&rsquo;ve written.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCoverLetter(true)}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            + Add Cover Letter
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
          <h3 className="text-lg font-bold text-white">No cover letters yet</h3>
          <p className="mt-2 text-sm text-slate-400">Add one when you write your first cover letter for an application.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              <Link href={`/career-hub/professional-profile/cover-letters/${entry.id}`} className="block">
                <p className="truncate font-semibold text-white">{entry.company || "Untitled"}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{entry.position || "No position set"}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                  <span>{entry.date || "No date"}</span>
                  <span>{entry.version || "No version"}</span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => deleteCoverLetter(entry.id)}
                className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-rose-300 transition hover:border-rose-400/60"
              >
                Delete
              </button>
            </Card>
          ))}
        </div>
      )}

      {showAddCoverLetter ? <AddCoverLetterModal onCancel={() => setShowAddCoverLetter(false)} onCreate={createCoverLetter} /> : null}
    </div>
  );
}
