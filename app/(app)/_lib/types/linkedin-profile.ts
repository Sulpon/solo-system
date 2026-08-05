// A single mirror of the LinkedIn profile, not a list - there's only ever
// one. Experience and Skills reference the Profile Database by id rather
// than restating it; Featured/Certifications/Projects are plain tag lists
// since no dedicated database exists for those yet.

export type LinkedInProfile = Readonly<{
  headline: string;
  about: string;
  experienceIds: ReadonlyArray<string>;
  skillIds: ReadonlyArray<string>;
  featured: ReadonlyArray<string>;
  certifications: ReadonlyArray<string>;
  projects: ReadonlyArray<string>;
  lastUpdated: string;
  notes: string;
}>;

export const DEFAULT_LINKEDIN_PROFILE: LinkedInProfile = {
  headline: "",
  about: "",
  experienceIds: [],
  skillIds: [],
  featured: [],
  certifications: [],
  projects: [],
  lastUpdated: "",
  notes: "",
};
