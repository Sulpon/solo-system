"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "../Card";
import EditableStringList from "../EditableStringList";
import { useCompanyEntries } from "../../_lib/hooks/useCompanyEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { VACANCY_STATUSES } from "../../_lib/types/vacancy";
import type { VacancyEntry, VacancyStatus } from "../../_lib/types/vacancy";

type VacancyDetailPageClientProps = Readonly<{ companyId: string; vacancyId: string }>;

const inputClass = "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition focus:border-purple-400";
const labelClass = "text-xs font-semibold uppercase tracking-[0.18em] text-slate-500";
const sectionLabelClass = "text-xs font-semibold uppercase tracking-[0.22em] text-purple-300";

export default function VacancyDetailPageClient({ companyId, vacancyId }: VacancyDetailPageClientProps) {
  const router = useRouter();
  const { entries: companies, hasLoaded: companiesLoaded } = useCompanyEntries();
  const { entries: vacancies, setEntries: setVacancies, hasLoaded: vacanciesLoaded } = useVacancyEntries();

  if (!companiesLoaded || !vacanciesLoaded) {
    return null;
  }

  const company = companies.find((item) => item.id === companyId);
  const entry = vacancies.find((vacancy) => vacancy.id === vacancyId && vacancy.companyId === companyId);

  if (!entry) {
    return (
      <Card className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/45 p-8 text-center">
        <p className={sectionLabelClass}>Vacancy Not Found</p>
        <h1 className="mt-3 text-2xl font-black text-white">This vacancy no longer exists</h1>
        <p className="mt-3 text-sm text-slate-400">It may have been deleted. Head back to the company to see its current vacancies.</p>
        <Link
          href={company ? `/career-hub/companies/${companyId}` : "/career-hub/companies"}
          className="mt-5 inline-block rounded-xl border border-purple-400/50 bg-purple-500/15 px-4 py-2 text-sm font-semibold text-purple-100 transition hover:bg-purple-500/25"
        >
          ← Back to {company ? company.name : "Companies"}
        </Link>
      </Card>
    );
  }

  function update(patch: Partial<VacancyEntry>) {
    setVacancies((current) => current.map((vacancy) => (vacancy.id === vacancyId ? { ...vacancy, ...patch } : vacancy)));
  }

  function deleteVacancy() {
    setVacancies((current) => current.filter((vacancy) => vacancy.id !== vacancyId));
    router.push(`/career-hub/companies/${companyId}`);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <Link
          href={`/career-hub/companies/${companyId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 transition hover:text-purple-300"
        >
          ← {company?.name ?? "Company"}
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className={sectionLabelClass}>Vacancy</p>
            <input
              value={entry.positionName}
              onChange={(event) => update({ positionName: event.target.value })}
              className="mt-2 w-full max-w-xl rounded-lg border border-transparent bg-transparent px-1 text-3xl font-black text-white outline-none transition focus:border-purple-400 focus:bg-slate-950/70"
              placeholder="Position Name"
            />
          </div>
          <button
            type="button"
            onClick={deleteVacancy}
            className="shrink-0 rounded-xl border border-rose-500/40 px-4 py-2 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/10"
          >
            Delete Vacancy
          </button>
        </div>
      </div>

      <Card className="p-5">
        <p className={sectionLabelClass}>Basic Information</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-2">
            <span className={labelClass}>Location</span>
            <input value={entry.location} onChange={(event) => update({ location: event.target.value })} className={inputClass} placeholder="Rotterdam, Netherlands" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Department</span>
            <input value={entry.department} onChange={(event) => update({ department: event.target.value })} className={inputClass} placeholder="Process Engineering" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Employment Type</span>
            <input value={entry.employmentType} onChange={(event) => update({ employmentType: event.target.value })} className={inputClass} placeholder="Full-time, Graduate Program..." />
          </label>
          <label className="space-y-2 lg:col-span-2">
            <span className={labelClass}>Job Link</span>
            <input value={entry.jobLink} onChange={(event) => update({ jobLink: event.target.value })} className={inputClass} placeholder="https://careers.example.com/job/123" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Application Deadline</span>
            <input type="date" value={entry.applicationDeadline} onChange={(event) => update({ applicationDeadline: event.target.value })} className={inputClass} />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Job Description</p>
        <textarea
          value={entry.jobDescription}
          onChange={(event) => update({ jobDescription: event.target.value })}
          className={inputClass + " mt-3 min-h-48"}
          placeholder="Paste the original job description or your own notes here..."
        />
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Match Evaluation</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Fit Rating (1-10)</span>
            <input
              type="number"
              min={1}
              max={10}
              value={entry.fitRating ?? ""}
              onChange={(event) => update({ fitRating: event.target.value === "" ? null : Math.min(10, Math.max(1, Number(event.target.value))) })}
              className={inputClass}
              placeholder="8"
            />
          </label>
          <div />
          <div className="space-y-2">
            <span className={labelClass}>Strengths</span>
            <EditableStringList items={entry.strengths} onChange={(next) => update({ strengths: next })} placeholder="Add a strength" />
          </div>
          <div className="space-y-2">
            <span className={labelClass}>Missing Skills</span>
            <EditableStringList items={entry.missingSkills} onChange={(next) => update({ missingSkills: next })} placeholder="Add a missing skill" />
          </div>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Notes</span>
            <textarea value={entry.evaluationNotes} onChange={(event) => update({ evaluationNotes: event.target.value })} className={inputClass + " min-h-20"} />
          </label>
        </div>
      </Card>

      <Card className="p-5">
        <p className={sectionLabelClass}>Application</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className={labelClass}>Status</span>
            <select value={entry.status} onChange={(event) => update({ status: event.target.value as VacancyStatus })} className={inputClass}>
              {VACANCY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Application Date</span>
            <input type="date" value={entry.applicationDate} onChange={(event) => update({ applicationDate: event.target.value })} className={inputClass} />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Next Action</span>
            <input
              value={entry.nextAction}
              onChange={(event) => update({ nextAction: event.target.value })}
              className={inputClass}
              placeholder="e.g. Follow up with recruiter, Prepare for technical interview..."
            />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>CV Version Used</span>
            <input value={entry.cvVersionUsed} onChange={(event) => update({ cvVersionUsed: event.target.value })} className={inputClass} placeholder="v3 - process engineering focus" />
          </label>
          <label className="space-y-2">
            <span className={labelClass}>Cover Letter</span>
            <input value={entry.coverLetter} onChange={(event) => update({ coverLetter: event.target.value })} className={inputClass} placeholder="v2, tailored to this role" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Recruiter</span>
            <input value={entry.recruiter} onChange={(event) => update({ recruiter: event.target.value })} className={inputClass} placeholder="Name, contact info" />
          </label>
          <label className="space-y-2 sm:col-span-2">
            <span className={labelClass}>Interview Notes</span>
            <textarea value={entry.interviewNotes} onChange={(event) => update({ interviewNotes: event.target.value })} className={inputClass + " min-h-24"} />
          </label>
        </div>
      </Card>
    </div>
  );
}
