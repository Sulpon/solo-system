import type { VacancyEntry } from "./types/vacancy";

// Deleting a company must never leave orphaned vacancies pointing at an id
// that no longer exists.
export function withoutCompanyVacancies(vacancies: ReadonlyArray<VacancyEntry>, companyId: string): VacancyEntry[] {
  return vacancies.filter((vacancy) => vacancy.companyId !== companyId);
}
