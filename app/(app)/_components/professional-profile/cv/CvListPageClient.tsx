"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../../Card";
import { useCvEntries } from "../../../_lib/hooks/useCvEntries";
import { createCvEntry } from "../../../_lib/types/cv";
import AddCvModal from "./AddCvModal";

export default function CvListPageClient() {
  const router = useRouter();
  const { entries, setEntries, hasLoaded } = useCvEntries();
  const [showAddCv, setShowAddCv] = useState(false);

  if (!hasLoaded) {
    return null;
  }

  function createCv(fields: { name: string; targetMarket: string }) {
    const entry = { ...createCvEntry(fields.name), targetMarket: fields.targetMarket };
    setEntries((current) => [...current, entry]);
    setShowAddCv(false);
    router.push(`/career-hub/professional-profile/cv/${entry.id}`);
  }

  function deleteCv(entryId: string) {
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
            <h1 className="mt-2 text-3xl font-black text-white">CV Versions</h1>
            <p className="mt-2 text-sm text-slate-400">Targeted CV variants, each selecting from your Profile Database rather than duplicating it.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCv(true)}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            + Add CV
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
          <h3 className="text-lg font-bold text-white">No CVs yet</h3>
          <p className="mt-2 text-sm text-slate-400">Add your first CV variant to get started - a Master CV, or one targeted at a specific market or role.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4">
              <Link href={`/career-hub/professional-profile/cv/${entry.id}`} className="block">
                <p className="truncate font-semibold text-white">{entry.name || "Untitled CV"}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{entry.targetMarket || "No target market set"}</p>
                <p className="mt-3 text-xs text-slate-400">{entry.lastUpdated ? `Updated ${entry.lastUpdated}` : "Not updated yet"}</p>
              </Link>
              <button
                type="button"
                onClick={() => deleteCv(entry.id)}
                className="mt-3 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-rose-300 transition hover:border-rose-400/60"
              >
                Delete
              </button>
            </Card>
          ))}
        </div>
      )}

      {showAddCv ? <AddCvModal onCancel={() => setShowAddCv(false)} onCreate={createCv} /> : null}
    </div>
  );
}
