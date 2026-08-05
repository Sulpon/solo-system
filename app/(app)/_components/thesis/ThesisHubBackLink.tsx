"use client";

import Link from "next/link";

export default function ThesisHubBackLink() {
  return (
    <Link
      href="/thesis-hub"
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
    >
      ← Thesis Hub
    </Link>
  );
}
