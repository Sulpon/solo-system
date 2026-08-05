// The Career Vision module is intentionally just reflection fields - no
// tracker, pipeline, or scoring. It exists so future modules (CV builder,
// company database, job applications) have a stable identity/direction
// record to read from.

export type CompetitiveAdvantageId = "engineering-foundation" | "data-ml" | "systems-thinking";

// Title is fixed per advantage slot (see CAREER_VISION_ADVANTAGE_TITLES) -
// only the description is user-editable.
export type CompetitiveAdvantage = Readonly<{
  id: CompetitiveAdvantageId;
  description: string;
}>;

export type CareerVisionIdentity = Readonly<{
  currentPosition: string;
  coreIdentity: string;
  competitiveAdvantages: ReadonlyArray<CompetitiveAdvantage>;
}>;

export type CareerVisionBackground = Readonly<{
  university: string;
  degree: string;
  expectedGraduation: string;
  location: string;
}>;

export type CareerVisionDirection = Readonly<{
  mainGoal: string;
}>;

export type CareerVisionData = Readonly<{
  identity: CareerVisionIdentity;
  background: CareerVisionBackground;
  targetRoles: ReadonlyArray<string>;
  careerPriorities: ReadonlyArray<string>;
  direction: CareerVisionDirection;
  preferredIndustries: ReadonlyArray<string>;
  targetCountries: ReadonlyArray<string>;
}>;

export const CAREER_VISION_ADVANTAGE_TITLES: Record<CompetitiveAdvantageId, string> = {
  "engineering-foundation": "Engineering Foundation",
  "data-ml": "Data & Machine Learning",
  "systems-thinking": "Systems Thinking",
};

export const DEFAULT_CAREER_VISION: CareerVisionData = {
  identity: {
    currentPosition: "MSc Chemical Engineering student specializing in data-driven process analysis, machine learning, and industrial optimization.",
    coreIdentity:
      "I am a data-driven chemical engineer combining chemical engineering expertise, machine learning, and statistical modelling to solve industrial problems through improved process understanding, monitoring, and optimization.",
    competitiveAdvantages: [
      {
        id: "engineering-foundation",
        description: "Understanding physical processes, process systems, and industrial operations to connect engineering knowledge with real-world problems.",
      },
      {
        id: "data-ml",
        description: "Transforming complex industrial datasets into insights using statistical modelling, machine learning, and data analysis techniques.",
      },
      {
        id: "systems-thinking",
        description: "Creating structured approaches to analyze problems, improve decision-making, and develop efficient solutions.",
      },
    ],
  },
  background: {
    university: "",
    degree: "",
    expectedGraduation: "",
    location: "",
  },
  targetRoles: [
    "Data-driven Process Engineer",
    "Process Data Scientist",
    "Industrial AI Engineer",
    "R&D Engineer (Data & Modelling)",
    "Advanced Process Control Engineer",
    "Process Engineer",
    "Manufacturing Data Analyst",
    "Digital Transformation Engineer",
  ],
  careerPriorities: [
    "Continuous learning and technical growth",
    "Strong company reputation and mentorship",
    "International environment",
    "Long-term salary progression",
    "Visa and relocation stability",
  ],
  direction: {
    mainGoal:
      "Secure an international engineering position where I can combine:\n- Chemical engineering expertise\n- Machine learning and data analytics\n- Process optimization\n- Industrial problem-solving",
  },
  preferredIndustries: [
    "Chemical & Specialty Chemicals",
    "Pharmaceutical & Biotechnology",
    "Energy & Sustainability",
    "Advanced Manufacturing",
    "Industrial Technology & Automation",
  ],
  targetCountries: [],
};
