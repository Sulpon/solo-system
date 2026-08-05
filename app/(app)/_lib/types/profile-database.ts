// The Profile Database is the single source of truth for education, skills,
// and experience - future CV generation, LinkedIn optimization, and job
// applications read from here rather than duplicating this data.
//
// Skill <-> Experience is a many-to-many relationship, but it is only ever
// stored on the Skill side (SkillEntry.relatedExperienceIds). An
// experience's "Skills Demonstrated" is always derived by looking up which
// skills reference it, so the relationship has exactly one primary location
// and can never drift out of sync.

export type SkillLevel = "Beginner" | "Intermediate" | "Advanced" | "Expert";

export const SKILL_LEVELS: ReadonlyArray<SkillLevel> = ["Beginner", "Intermediate", "Advanced", "Expert"];

// Suggested, not enforced - the category field stays free text (with these
// as datalist options) so new categories can be added without a code change.
export const SKILL_CATEGORY_SUGGESTIONS: ReadonlyArray<string> = [
  "Chemical Engineering",
  "Data Science & Machine Learning",
  "Chemometrics",
  "Software & Tools",
];

export type ExperienceType = "Research" | "Academic Project" | "Internship" | "Work Experience" | "Personal Project" | "Leadership";

export const EXPERIENCE_TYPES: ReadonlyArray<ExperienceType> = [
  "Research",
  "Academic Project",
  "Internship",
  "Work Experience",
  "Personal Project",
  "Leadership",
];

export type EducationEntry = Readonly<{
  id: string;
  degree: string;
  institution: string;
  location: string;
  fieldOfStudy: string;
  specialization: string;
  startDate: string;
  endDate: string;
  status: string;
}>;

export type SkillEntry = Readonly<{
  id: string;
  name: string;
  category: string;
  level: SkillLevel;
  description: string;
  evidence: string;
  relatedExperienceIds: ReadonlyArray<string>;
}>;

export type ExperienceEntry = Readonly<{
  id: string;
  title: string;
  type: ExperienceType;
  organization: string;
  startDate: string;
  endDate: string;
  description: string;
  objective: string;
  responsibilities: string;
  methods: string;
  tools: string;
  results: string;
}>;

export const DEFAULT_EDUCATION_ENTRIES: ReadonlyArray<EducationEntry> = [
  {
    id: "education-seed-1",
    degree: "MSc Chemical and Process Engineering",
    institution: "University of Padua",
    location: "Padua, Italy",
    fieldOfStudy: "Chemical Engineering",
    specialization: "Data-driven process analysis, machine learning, and industrial optimization",
    startDate: "",
    endDate: "November 2026",
    status: "Current student",
  },
];

export const DEFAULT_EXPERIENCE_ENTRIES: ReadonlyArray<ExperienceEntry> = [
  {
    id: "experience-seed-1",
    title: "MSc Thesis Research",
    type: "Research",
    organization: "University of Padua",
    startDate: "",
    endDate: "",
    description: "",
    objective: "Analysis of complex process datasets using data-driven methods.",
    responsibilities: "Development and evaluation of modelling approaches.",
    methods: "Multivariate analysis, machine learning, statistical modelling.",
    tools: "Python, Scikit-learn",
    results: "",
  },
];

export const DEFAULT_SKILL_ENTRIES: ReadonlyArray<SkillEntry> = [
  {
    id: "skill-seed-1",
    name: "Python",
    category: "Data Science & Machine Learning",
    level: "Intermediate",
    description: "Programming language used for data analysis and machine learning workflows.",
    evidence: "Used in MSc thesis research for data processing and modelling.",
    relatedExperienceIds: ["experience-seed-1"],
  },
];

export function createProfileEntryId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
