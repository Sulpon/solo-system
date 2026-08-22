import { getLocalDayKey } from "../local-day";
import type { VacancyEntry } from "../types/vacancy";

// ---------------------------------------------------------------------------
// Applications calendar, totals, and averages - all derived from the real
// `applicationDate` field already on VacancyEntry (see vacancy.ts). No
// separate "application" record is created; a vacancy IS the application
// once it has an applicationDate.
// ---------------------------------------------------------------------------

// "Submitted" means an application actually went out - not merely saved or
// being prepared. If a vacancy is moved back to Interested/Preparing, it
// drops out of this count (and therefore out of any goal/calendar built on
// it) even if an applicationDate is still set on it.
function submittedVacancies(vacancies: ReadonlyArray<VacancyEntry>) {
  return vacancies.filter((vacancy) => vacancy.applicationDate.trim() !== "" && vacancy.status !== "Interested" && vacancy.status !== "Preparing");
}

export function getApplicationsCalendarData(vacancies: ReadonlyArray<VacancyEntry>): Map<string, VacancyEntry[]> {
  const byDay = new Map<string, VacancyEntry[]>();

  submittedVacancies(vacancies).forEach((vacancy) => {
    const key = vacancy.applicationDate;
    const existing = byDay.get(key);

    if (existing) {
      existing.push(vacancy);
    } else {
      byDay.set(key, [vacancy]);
    }
  });

  return byDay;
}

export function getTotalApplications(vacancies: ReadonlyArray<VacancyEntry>): number {
  return submittedVacancies(vacancies).length;
}

function startOfWeek(referenceDate: Date) {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start;
}

function applicationsInRange(vacancies: ReadonlyArray<VacancyEntry>, start: Date, end: Date) {
  const startKey = getLocalDayKey(start);
  const endKey = getLocalDayKey(end);
  return submittedVacancies(vacancies).filter((vacancy) => vacancy.applicationDate >= startKey && vacancy.applicationDate <= endKey).length;
}

export function getApplicationsToday(vacancies: ReadonlyArray<VacancyEntry>, referenceDate = new Date()): number {
  const todayKey = getLocalDayKey(referenceDate);
  return submittedVacancies(vacancies).filter((vacancy) => vacancy.applicationDate === todayKey).length;
}

export function getApplicationsThisWeek(vacancies: ReadonlyArray<VacancyEntry>, referenceDate = new Date()): number {
  const start = startOfWeek(referenceDate);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return applicationsInRange(vacancies, start, end);
}

export function getApplicationsThisMonth(vacancies: ReadonlyArray<VacancyEntry>, referenceDate = new Date()): number {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return applicationsInRange(vacancies, start, end);
}

// Average applications per day since the first submission (inclusive of days
// with none) - reflects real pace, same convention as thesis-engine.ts.
export function getAverageApplicationsPerDay(vacancies: ReadonlyArray<VacancyEntry>, referenceDate = new Date()): number {
  const submitted = submittedVacancies(vacancies);

  if (submitted.length === 0) {
    return 0;
  }

  const earliestKey = submitted.reduce((earliest, vacancy) => (vacancy.applicationDate < earliest ? vacancy.applicationDate : earliest), submitted[0].applicationDate);
  const earliestDate = new Date(`${earliestKey}T00:00:00`);
  const today = new Date(referenceDate);
  today.setHours(0, 0, 0, 0);
  const daysSinceFirst = Math.max(1, Math.floor((today.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return Math.round((submitted.length / daysSinceFirst) * 10) / 10;
}
