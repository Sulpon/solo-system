"use client";

import { useMemo } from "react";
import Card from "../Card";
import StatCard from "../StatCard";
import CareerHubNavCard from "./CareerHubNavCard";
import ApplicationPipelinePanel from "../applications/ApplicationPipelinePanel";
import ApplicationsCalendar from "../applications/ApplicationsCalendar";
import LinkedMetricGoalCard from "../goal-tree/LinkedMetricGoalCard";
import { useCareerVision } from "../../_lib/hooks/useCareerVision";
import { useEducationEntries } from "../../_lib/hooks/useEducationEntries";
import { useSkillEntries } from "../../_lib/hooks/useSkillEntries";
import { useExperienceEntries } from "../../_lib/hooks/useExperienceEntries";
import { useCompanyEntries } from "../../_lib/hooks/useCompanyEntries";
import { useVacancyEntries } from "../../_lib/hooks/useVacancyEntries";
import { useCvEntries } from "../../_lib/hooks/useCvEntries";
import { useCoverLetterEntries } from "../../_lib/hooks/useCoverLetterEntries";
import { getApplicationsThisMonth, getApplicationsThisWeek, getApplicationsToday, getTotalApplications } from "../../_lib/engines/career-hub-engine";

function ChipList({ items, emptyLabel }: Readonly<{ items: ReadonlyArray<string>; emptyLabel: string }>) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  const visible = items.slice(0, 4);
  const remaining = items.length - visible.length;

  return (
    <div className="flex flex-wrap gap-1.5">
      {visible.map((item) => (
        <span key={item} className="rounded-lg border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs text-slate-300">
          {item}
        </span>
      ))}
      {remaining > 0 ? <span className="rounded-lg border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs text-slate-500">+{remaining} more</span> : null}
    </div>
  );
}

export default function CareerHubPageClient() {
  const { careerVision, hasLoaded: careerVisionLoaded } = useCareerVision();
  const { entries: educationEntries, hasLoaded: educationLoaded } = useEducationEntries();
  const { entries: skillEntries, hasLoaded: skillsLoaded } = useSkillEntries();
  const { entries: experienceEntries, hasLoaded: experienceLoaded } = useExperienceEntries();
  const { entries: companyEntries, hasLoaded: companiesLoaded } = useCompanyEntries();
  const { entries: vacancyEntries, hasLoaded: vacanciesLoaded } = useVacancyEntries();
  const { entries: cvEntries, hasLoaded: cvLoaded } = useCvEntries();
  const { entries: coverLetterEntries, hasLoaded: coverLettersLoaded } = useCoverLetterEntries();

  const companyNames = useMemo(() => new Map(companyEntries.map((company) => [company.id, company.name] as const)), [companyEntries]);

  if (!careerVisionLoaded || !educationLoaded || !skillsLoaded || !experienceLoaded || !companiesLoaded || !vacanciesLoaded || !cvLoaded || !coverLettersLoaded) {
    return null;
  }

  const totalApplications = getTotalApplications(vacancyEntries);
  const applicationsThisWeek = getApplicationsThisWeek(vacancyEntries);
  const applicationsToday = getApplicationsToday(vacancyEntries);
  const applicationsThisMonth = getApplicationsThisMonth(vacancyEntries);
  const savedVacancies = vacancyEntries.filter((vacancy) => vacancy.status === "Interested").length;
  const interviews = vacancyEntries.filter((vacancy) => vacancy.status === "Interview").length;
  const offers = vacancyEntries.filter((vacancy) => vacancy.status === "Offer").length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-purple-500/20 bg-slate-950/45 p-5 shadow-[0_0_30px_rgba(88,28,135,0.14)] backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Atlas</p>
        <h1 className="mt-2 text-3xl font-black text-white">Career Hub</h1>
        <p className="mt-2 text-sm text-slate-400">Your career operating system - identity, background, target companies, and what&rsquo;s next, all in one place.</p>
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Career Identity</p>
        <div className="mt-4 grid gap-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Current Position</p>
            <p className="mt-1.5 text-sm text-slate-200">{careerVision.identity.currentPosition || "Not set yet - fill this in on Career Vision."}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Target Professional Identity</p>
            <p className="mt-1.5 text-sm text-slate-200">{careerVision.identity.coreIdentity || "Not set yet - fill this in on Career Vision."}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Target Roles</p>
            <div className="mt-2">
              <ChipList items={careerVision.targetRoles} emptyLabel="No target roles yet." />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Preferred Industries</p>
            <div className="mt-2">
              <ChipList items={careerVision.preferredIndustries} emptyLabel="No preferred industries yet." />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Target Countries</p>
            <div className="mt-2">
              <ChipList items={careerVision.targetCountries} emptyLabel="No target countries yet." />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Job-Search Overview</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Target Roles" value={careerVision.targetRoles.length} accentClass="text-purple-300" />
          <StatCard label="Applications" value={totalApplications} detail={`${applicationsThisWeek} this week · ${applicationsThisMonth} this month`} accentClass="text-purple-300" />
          <StatCard label="Saved Vacancies" value={savedVacancies} accentClass="text-purple-300" />
          <StatCard label="Interviews" value={interviews} accentClass="text-purple-300" />
          <StatCard label="Offers" value={offers} accentClass="text-purple-300" />
        </div>
      </Card>

      <ApplicationPipelinePanel vacancies={vacancyEntries} companyNames={companyNames} />

      <LinkedMetricGoalCard
        metricId="career-applications-submitted"
        thisWeekValue={applicationsThisWeek}
        todayValue={applicationsToday}
        accentClass="text-purple-300"
        defaultTitle="Land the next role"
        defaultTargetValue={50}
      />

      <Card className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-purple-300">Applications Calendar</p>
        <h2 className="mt-2 text-xl font-black text-white">Submission activity</h2>
        <div className="mt-5">
          <ApplicationsCalendar vacancies={vacancyEntries} companyNames={companyNames} />
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <CareerHubNavCard href="/career-hub/vision" emoji="🎯" title="Career Vision" description="Identity, principles, and career direction." />
        <CareerHubNavCard
          href="/career-hub/profile"
          emoji="🧬"
          title="Profile Database"
          description="Education, skills, and experience."
          meta={`${educationEntries.length} education · ${skillEntries.length} skills · ${experienceEntries.length} experience`}
        />
        <CareerHubNavCard
          href="/career-hub/companies"
          emoji="🏢"
          title="Companies Database"
          description="Target companies and research."
          meta={`${companyEntries.length} companies · ${vacancyEntries.length} vacancies tracked`}
        />
        <CareerHubNavCard
          href="/career-hub/professional-profile"
          emoji="📄"
          title="Professional Profile"
          description="CV, LinkedIn, cover letters, and portfolio links."
          meta={`${cvEntries.length} CVs · ${coverLetterEntries.length} cover letters`}
        />
        <CareerHubNavCard
          href="/career-hub/applications"
          emoji="📋"
          title="Applications Dashboard"
          description="Pipeline overview across every tracked vacancy."
          meta={`${vacancyEntries.length} vacancies tracked`}
        />
      </div>
    </div>
  );
}
