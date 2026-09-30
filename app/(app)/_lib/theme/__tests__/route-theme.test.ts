import { describe, expect, it } from "vitest";
import { resolveDomainThemeId, resolveDomainTheme, THEMED_ROUTE_PREFIXES } from "../route-theme";
import { DEFAULT_DOMAIN_THEME_ID, DOMAIN_THEMES, DOMAIN_THEME_IDS, domainThemeStyle } from "../domain-themes";

describe("resolveDomainThemeId", () => {
  it("themes each domain route", () => {
    expect(resolveDomainThemeId("/workouts")).toBe("calisthenics");
    expect(resolveDomainThemeId("/library")).toBe("reading");
    expect(resolveDomainThemeId("/career-hub")).toBe("career");
    expect(resolveDomainThemeId("/thesis-hub")).toBe("thesis");
    expect(resolveDomainThemeId("/world-map")).toBe("exploration");
  });

  it("keeps the theme across a domain's nested routes, so deep links are not unthemed", () => {
    expect(resolveDomainThemeId("/career-hub/professional-profile/cv/abc-123")).toBe("career");
    expect(resolveDomainThemeId("/thesis-hub/research/experiments/exp-1")).toBe("thesis");
  });

  it("falls back to Home Base for the root and for cross-cutting systems", () => {
    expect(resolveDomainThemeId("/")).toBe("home-base");
    expect(resolveDomainThemeId("/quests")).toBe("home-base");
    expect(resolveDomainThemeId("/settings")).toBe("home-base");
  });

  it("falls back safely for an unknown or malformed route rather than rendering unthemed", () => {
    expect(resolveDomainThemeId("/does-not-exist")).toBe(DEFAULT_DOMAIN_THEME_ID);
    expect(resolveDomainThemeId("")).toBe(DEFAULT_DOMAIN_THEME_ID);
    expect(resolveDomainThemeId("not-a-path")).toBe(DEFAULT_DOMAIN_THEME_ID);
  });

  it("ignores trailing slashes, query strings and hashes", () => {
    expect(resolveDomainThemeId("/library/")).toBe("reading");
    expect(resolveDomainThemeId("/library?view=books")).toBe("reading");
    expect(resolveDomainThemeId("/library#top")).toBe("reading");
  });

  it("does not let a prefix match a different route that merely starts with the same text", () => {
    expect(resolveDomainThemeId("/library-archive")).toBe(DEFAULT_DOMAIN_THEME_ID);
    expect(resolveDomainThemeId("/workouts-old")).toBe(DEFAULT_DOMAIN_THEME_ID);
  });

  it("returns the full theme object for a path", () => {
    expect(resolveDomainTheme("/workouts").label).toBe("Training");
  });
});

describe("domain theme registry", () => {
  it("defines every theme the router can return", () => {
    for (const prefix of THEMED_ROUTE_PREFIXES) {
      expect(DOMAIN_THEMES[resolveDomainThemeId(prefix)]).toBeDefined();
    }
  });

  it("only routes to themes that actually have a page", () => {
    for (const prefix of THEMED_ROUTE_PREFIXES) {
      expect(DOMAIN_THEMES[resolveDomainThemeId(prefix)].hasPage).toBe(true);
    }

    expect(DOMAIN_THEMES[DEFAULT_DOMAIN_THEME_ID].hasPage).toBe(true);
  });

  it("marks a theme as pageless exactly when no route resolves to it", () => {
    const reachable = new Set([DEFAULT_DOMAIN_THEME_ID, ...THEMED_ROUTE_PREFIXES.map(resolveDomainThemeId)]);

    for (const id of DOMAIN_THEME_IDS) {
      expect(DOMAIN_THEMES[id].hasPage).toBe(reachable.has(id));
    }
  });

  it("gives every theme a distinct accent, so no two domains read as the same page", () => {
    const accents = DOMAIN_THEME_IDS.map((id) => DOMAIN_THEMES[id].tokens.accent);

    expect(new Set(accents).size).toBe(accents.length);
  });

  it("gives every theme a label and a tagline", () => {
    for (const id of DOMAIN_THEME_IDS) {
      expect(DOMAIN_THEMES[id].label.trim().length).toBeGreaterThan(0);
      expect(DOMAIN_THEMES[id].tagline.trim().length).toBeGreaterThan(0);
    }
  });

  it("overrides --menace-accent so existing components adopt the domain accent without changes", () => {
    const style = domainThemeStyle(DOMAIN_THEMES.calisthenics) as Record<string, string>;

    expect(style["--menace-accent"]).toBe(DOMAIN_THEMES.calisthenics.tokens.accent);
    expect(style["--atlas-accent"]).toBe(DOMAIN_THEMES.calisthenics.tokens.accent);
  });

  it("emits a motion duration for every theme, with calm domains slower than sharp ones", () => {
    const duration = (id: (typeof DOMAIN_THEME_IDS)[number]) => Number.parseInt(String((domainThemeStyle(DOMAIN_THEMES[id]) as Record<string, string>)["--atlas-motion-duration"]), 10);

    expect(duration("peace")).toBeGreaterThan(duration("home-base"));
    expect(duration("home-base")).toBeGreaterThan(duration("trading"));
  });

  it("reuses the existing capture domain vocabulary instead of inventing a second one", () => {
    expect(DOMAIN_THEMES.calisthenics.captureDomain).toBe("workout");
    expect(DOMAIN_THEMES.reading.captureDomain).toBe("reading");
    expect(DOMAIN_THEMES["home-base"].captureDomain).toBeNull();
  });
});
