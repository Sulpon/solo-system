// A single record of external presentation links - not a list. GitHub /
// Personal Website / Portfolio are each one canonical link; the other
// categories are naturally multi-item so they're plain tag lists.

export type PortfolioProfile = Readonly<{
  githubUrl: string;
  websiteUrl: string;
  portfolioUrl: string;
  research: ReadonlyArray<string>;
  publications: ReadonlyArray<string>;
  presentations: ReadonlyArray<string>;
  certificates: ReadonlyArray<string>;
}>;

export const DEFAULT_PORTFOLIO_PROFILE: PortfolioProfile = {
  githubUrl: "",
  websiteUrl: "",
  portfolioUrl: "",
  research: [],
  publications: [],
  presentations: [],
  certificates: [],
};
