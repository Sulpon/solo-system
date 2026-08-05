"use client";

import Link from "next/link";
import Card from "../../Card";
import EditableStringList from "../../EditableStringList";
import { usePortfolioProfile } from "../../../_lib/hooks/usePortfolioProfile";
import type { PortfolioProfile } from "../../../_lib/types/portfolio-profile";

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

export default function PortfolioPageClient() {
  const { profile, setProfile, hasLoaded } = usePortfolioProfile();

  if (!hasLoaded) {
    return null;
  }

  function update(patch: Partial<PortfolioProfile>) {
    setProfile((current) => ({ ...current, ...patch }));
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
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Professional Profile</p>
        <h1 className="mt-2 text-3xl font-black text-white">Portfolio</h1>
        <p className="mt-2 text-sm text-slate-400">Links to everything that represents your work externally.</p>
      </div>

      <Card className="p-5">
        <p className={sectionLabelClass}>Links</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>GitHub</span>
            <input value={profile.githubUrl} onChange={(event) => update({ githubUrl: event.target.value })} className={inputClass} placeholder="https://github.com/username" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Personal Website</span>
            <input value={profile.websiteUrl} onChange={(event) => update({ websiteUrl: event.target.value })} className={inputClass} placeholder="https://yourname.com" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Portfolio</span>
            <input value={profile.portfolioUrl} onChange={(event) => update({ portfolioUrl: event.target.value })} className={inputClass} placeholder="https://yourname.com/portfolio" />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Research</p>
        <div className="mt-3">
          <EditableStringList items={profile.research} onChange={(next) => update({ research: next })} placeholder="Add a research link or reference" />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Publications</p>
        <div className="mt-3">
          <EditableStringList items={profile.publications} onChange={(next) => update({ publications: next })} placeholder="Add a publication" />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Presentations</p>
        <div className="mt-3">
          <EditableStringList items={profile.presentations} onChange={(next) => update({ presentations: next })} placeholder="Add a presentation" />
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Certificates</p>
        <div className="mt-3">
          <EditableStringList items={profile.certificates} onChange={(next) => update({ certificates: next })} placeholder="Add a certificate" />
        </div>
      </Card>
    </div>
  );
}
