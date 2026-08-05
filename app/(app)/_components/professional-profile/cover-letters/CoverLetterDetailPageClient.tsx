"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../../Card";
import { useCoverLetterEntries } from "../../../_lib/hooks/useCoverLetterEntries";
import type { CoverLetterEntry } from "../../../_lib/types/cover-letter";

type CoverLetterDetailPageClientProps = Readonly<{ coverLetterId: string }>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

export default function CoverLetterDetailPageClient({ coverLetterId }: CoverLetterDetailPageClientProps) {
  const router = useRouter();
  const { entries, setEntries, hasLoaded } = useCoverLetterEntries();

  if (!hasLoaded) {
    return null;
  }

  const entry = entries.find((coverLetter) => coverLetter.id === coverLetterId);

  if (!entry) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className={sectionLabelClass}>Cover Letter Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">This cover letter no longer exists</h1>
        <p className="mt-3 text-sm text-slate-400">It may have been deleted. Head back to the list to pick another one.</p>
        <Link
          href="/career-hub/professional-profile/cover-letters"
          className="mt-5 inline-block rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          ← Back to Cover Letters
        </Link>
      </Card>
    );
  }

  function update(patch: Partial<CoverLetterEntry>) {
    setEntries((current) => current.map((coverLetter) => (coverLetter.id === coverLetterId ? { ...coverLetter, ...patch } : coverLetter)));
  }

  function deleteCoverLetter() {
    setEntries((current) => current.filter((coverLetter) => coverLetter.id !== coverLetterId));
    router.push("/career-hub/professional-profile/cover-letters");
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href="/career-hub/professional-profile/cover-letters"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← Cover Letters
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={sectionLabelClass}>Cover Letter</p>
            <input
              value={entry.company}
              onChange={(event) => update({ company: event.target.value })}
              className="mt-2 w-full max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-3xl font-black text-white outline-none transition focus:border-purple-400 focus:bg-slate-950/70"
              placeholder="Company"
            />
          </div>
          <button
            type="button"
            onClick={deleteCoverLetter}
            className="shrink-0 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Delete Cover Letter
          </button>
        </div>
      </div>

      <Card className="p-5">
        <p className={sectionLabelClass}>Basic Information</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Position</span>
            <input value={entry.position} onChange={(event) => update({ position: event.target.value })} className={inputClass} placeholder="Process Engineer" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Date</span>
            <input type="date" value={entry.date} onChange={(event) => update({ date: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Version</span>
            <input value={entry.version} onChange={(event) => update({ version: event.target.value })} className={inputClass} placeholder="v2 - tailored to process engineering" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Notes</span>
            <textarea value={entry.notes} onChange={(event) => update({ notes: event.target.value })} className={inputClass + " min-h-40"} />
          </label>
        </div>
      </Card>
    </div>
  );
}
