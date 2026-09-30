"use client";

import Link from "next/link";
import Card from "./_components/Card";

// Segment-level error boundary for everything rendered inside the Atlas
// shell (every page under app/(app)/). Catches a crash in a PAGE without
// taking down the providers/chrome around it, so the user keeps a working
// app and a real "go back / try again" instead of a dead screen. A crash in
// the layout or its providers is caught one level up, by app/global-error.tsx
// - see that file for why both exist.
export default function AppSegmentError({ error, reset }: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-xl p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-300">Atlas</p>
        <h1 className="mt-2 text-xl font-black text-white">This page hit an unexpected error.</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          The rest of Atlas is still running and your local data is untouched. Try again, or head back to Mission Control.
        </p>

        <pre className="mt-4 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-rose-300">
          {error.message || "Unknown error"}
          {error.digest ? `\n\ndigest: ${error.digest}` : ""}
        </pre>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
          >
            Try again
          </button>
          <Link href="/" className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:text-white">
            Back to Mission Control
          </Link>
        </div>
      </Card>
    </div>
  );
}
