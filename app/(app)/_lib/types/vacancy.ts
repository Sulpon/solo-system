// A Vacancy is one specific job opening at a Company (see
// _lib/types/company-database.ts). Companies are researched once; a company
// can have zero, one, or many vacancies, each tracked independently - fit
// rating, application status, and interview notes all belong to the
// vacancy, not the company, so applying to two different roles at the same
// employer never overwrites the same fields.

export type VacancyStatus = "Interested" | "Preparing" | "Applied" | "Interview" | "Offer" | "Rejected" | "Closed";

export const VACANCY_STATUSES: ReadonlyArray<VacancyStatus> = ["Interested", "Preparing", "Applied", "Interview", "Offer", "Rejected", "Closed"];

// Furthest along in the pipeline first; Rejected/Closed sort last since
// they're no longer active leads regardless of how far they got.
const STATUS_RANK: Record<VacancyStatus, number> = {
  Offer: 0,
  Interview: 1,
  Applied: 2,
  Preparing: 3,
  Interested: 4,
  Rejected: 5,
  Closed: 6,
};

export function compareVacancyStatus(first: VacancyStatus, second: VacancyStatus) {
  return STATUS_RANK[first] - STATUS_RANK[second];
}

export type VacancyEntry = Readonly<{
  id: string;
  companyId: string;

  // Basic Information
  positionName: string;
  location: string;
  department: string;
  employmentType: string;
  jobLink: string;
  applicationDeadline: string;

  // Job Description
  jobDescription: string;

  // Match Evaluation
  fitRating: number | null;
  strengths: ReadonlyArray<string>;
  missingSkills: ReadonlyArray<string>;
  evaluationNotes: string;

  // Application
  status: VacancyStatus;
  cvVersionUsed: string;
  coverLetter: string;
  applicationDate: string;
  recruiter: string;
  interviewNotes: string;
  nextAction: string;
}>;

export function createVacancyId() {
  return `vacancy-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Vacancies are always created with just a company id up front - the rest
// gets filled in on the vacancy's own page.
export function createVacancyEntry(companyId: string): VacancyEntry {
  return {
    id: createVacancyId(),
    companyId,
    positionName: "",
    location: "",
    department: "",
    employmentType: "",
    jobLink: "",
    applicationDeadline: "",
    jobDescription: "",
    fitRating: null,
    strengths: [],
    missingSkills: [],
    evaluationNotes: "",
    status: "Interested",
    cvVersionUsed: "",
    coverLetter: "",
    applicationDate: "",
    recruiter: "",
    interviewNotes: "",
    nextAction: "",
  };
}
