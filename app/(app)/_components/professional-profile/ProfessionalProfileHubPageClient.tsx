"use client";

import CareerHubBackLink from "../career/CareerHubBackLink";
import CareerHubNavCard from "../career/CareerHubNavCard";
import { useCvEntries } from "../../_lib/hooks/useCvEntries";
import { useCoverLetterEntries } from "../../_lib/hooks/useCoverLetterEntries";

export default function ProfessionalProfileHubPageClient() {
  const { entries: cvEntries, hasLoaded: cvLoaded } = useCvEntries();
  const { entries: coverLetterEntries, hasLoaded: coverLettersLoaded } = useCoverLetterEntries();

  if (!cvLoaded || !coverLettersLoaded) {
    return null;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <CareerHubBackLink />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Hub</p>
        <h1 className="mt-2 text-3xl font-black text-white">📄 Professional Profile</h1>
        <p className="mt-2 text-sm text-slate-400">
          The external presentation layer - CV, LinkedIn, cover letters, and portfolio links. The Profile Database stays the single source of truth; everything here organizes and
          reuses it rather than duplicating it.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <CareerHubNavCard href="/career-hub/professional-profile/cv" emoji="📄" title="CV" description="Targeted CV versions, referencing your Profile Database." meta={`${cvEntries.length} CVs`} />
        <CareerHubNavCard href="/career-hub/professional-profile/linkedin" emoji="💼" title="LinkedIn" description="A mirror of your LinkedIn profile." />
        <CareerHubNavCard
          href="/career-hub/professional-profile/cover-letters"
          emoji="✉️"
          title="Cover Letters"
          description="Every cover letter you've written, kept together."
          meta={`${coverLetterEntries.length} cover letters`}
        />
        <CareerHubNavCard href="/career-hub/professional-profile/portfolio" emoji="🔗" title="Portfolio" description="GitHub, website, research, and other external links." />
      </div>
    </div>
  );
}
