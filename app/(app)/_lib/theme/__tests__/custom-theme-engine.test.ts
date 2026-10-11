import { describe, expect, it } from "vitest";
import {
  assignRouteTheme,
  buildCustomTheme,
  deleteCustomTheme,
  deriveGlow,
  draftFromTheme,
  findThemeById,
  hexToRgbTriplet,
  materialiseCustomTheme,
  parseRgbTriplet,
  resolveThemeFor,
  rgbTripletToHex,
  tokensFromDraft,
  upsertCustomTheme,
  validateDraft,
  type CustomThemeDraft,
} from "../custom-theme-engine";
import { DOMAIN_THEMES } from "../domain-themes";
import { EMPTY_PAGE_THEME_SETTINGS, type PageThemeSettings } from "../../types/custom-theme";

function draft(overrides: Partial<CustomThemeDraft> = {}): CustomThemeDraft {
  return { ...draftFromTheme(DOMAIN_THEMES["home-base"]), label: "Midnight", ...overrides };
}

describe("colour helpers", () => {
  it("accepts a valid rgb triplet", () => {
    expect(parseRgbTriplet("167 139 250")).toEqual([167, 139, 250]);
    expect(parseRgbTriplet("  0 0 0 ")).toEqual([0, 0, 0]);
  });

  it("rejects anything that would break the CSS variable", () => {
    expect(parseRgbTriplet("167,139,250")).toBeNull();
    expect(parseRgbTriplet("300 0 0")).toBeNull();
    expect(parseRgbTriplet("#a78bfa")).toBeNull();
    expect(parseRgbTriplet("")).toBeNull();
  });

  it("round-trips hex and triplet", () => {
    expect(hexToRgbTriplet("#a78bfa")).toBe("167 139 250");
    expect(hexToRgbTriplet("abc")).toBe("170 187 204");
    expect(rgbTripletToHex("167 139 250")).toBe("#a78bfa");
  });

  it("refuses a bad hex rather than producing a broken colour", () => {
    expect(hexToRgbTriplet("nope")).toBeNull();
    expect(hexToRgbTriplet("#12345")).toBeNull();
  });

  it("derives the glow from the accent so the two cannot clash", () => {
    expect(deriveGlow("167 139 250")).toBe("0 0 60px rgba(167, 139, 250, 0.16)");
  });
});

describe("drafts and validation", () => {
  it("seeds a draft from a built-in theme", () => {
    const seeded = draftFromTheme(DOMAIN_THEMES.trading);

    expect(seeded.baseThemeId).toBe("trading");
    expect(seeded.accent).toBe(DOMAIN_THEMES.trading.tokens.accent);
  });

  it("inherits the ambient and decor it does not expose, rather than inventing them", () => {
    const tokens = tokensFromDraft(draft({ baseThemeId: "exploration", accent: "1 2 3" }));

    expect(tokens.ambient).toBe(DOMAIN_THEMES.exploration.tokens.ambient);
    expect(tokens.decor).toBe(DOMAIN_THEMES.exploration.tokens.decor);
    expect(tokens.accent).toBe("1 2 3");
    expect(tokens.glow).toBe(deriveGlow("1 2 3"));
  });

  it("passes a sound draft", () => {
    expect(validateDraft(draft())).toEqual([]);
  });

  it("catches an empty name and a malformed accent", () => {
    const problems = validateDraft(draft({ label: "  ", accent: "not a colour" }));

    expect(problems.map((entry) => entry.field).sort()).toEqual(["accent", "label"]);
  });
});

describe("storing themes", () => {
  it("adds a new theme and keeps its id on update", () => {
    const created = buildCustomTheme(draft(), null, "2026-10-10T10:00:00.000Z");
    const one = upsertCustomTheme(EMPTY_PAGE_THEME_SETTINGS, created);
    const edited = buildCustomTheme(draft({ label: "Renamed" }), created, "2026-10-11T10:00:00.000Z");
    const two = upsertCustomTheme(one, edited);

    expect(one.customThemes).toHaveLength(1);
    expect(two.customThemes).toHaveLength(1);
    expect(two.customThemes[0].label).toBe("Renamed");
    expect(two.customThemes[0].id).toBe(created.id);
    expect(two.customThemes[0].createdAt).toBe("2026-10-10T10:00:00.000Z");
    expect(two.customThemes[0].updatedAt).toBe("2026-10-11T10:00:00.000Z");
  });

  it("releases the pages pinned to a theme it deletes", () => {
    const created = buildCustomTheme(draft(), null);
    let settings = upsertCustomTheme(EMPTY_PAGE_THEME_SETTINGS, created);
    settings = assignRouteTheme(settings, "/notes", created.id);
    settings = assignRouteTheme(settings, "/goals", "trading");

    const after = deleteCustomTheme(settings, created.id);

    expect(after.customThemes).toHaveLength(0);
    expect(after.routeThemes).toEqual({ "/goals": "trading" });
  });

  it("clears an assignment rather than freezing the page on its current look", () => {
    const assigned = assignRouteTheme(EMPTY_PAGE_THEME_SETTINGS, "/notes", "peace");

    expect(assignRouteTheme(assigned, "/notes", null).routeThemes).toEqual({});
  });
});

describe("resolveThemeFor", () => {
  const custom = buildCustomTheme(draft({ label: "Midnight", accent: "10 20 30" }), null);
  const settings: PageThemeSettings = {
    customThemes: [custom],
    routeThemes: { "/notes": custom.id, "/career-hub": "peace", "/career-hub/applications": "trading" },
  };

  it("falls back to the built-in route map when nothing is pinned", () => {
    // /library is Reading in the stock map.
    expect(resolveThemeFor("/library", EMPTY_PAGE_THEME_SETTINGS).id).toBe("reading");
    expect(resolveThemeFor("/library", EMPTY_PAGE_THEME_SETTINGS).isCustom).toBe(false);
  });

  it("uses a custom theme pinned to a page", () => {
    const resolved = resolveThemeFor("/notes", settings);

    expect(resolved.id).toBe(custom.id);
    expect(resolved.isCustom).toBe(true);
    expect(resolved.tokens.accent).toBe("10 20 30");
  });

  it("covers child routes of a pinned prefix", () => {
    expect(resolveThemeFor("/career-hub/companies", settings).id).toBe("peace");
  });

  it("lets the longest matching prefix win", () => {
    expect(resolveThemeFor("/career-hub/applications", settings).id).toBe("trading");
  });

  it("pins a built-in theme just as well as a custom one", () => {
    expect(resolveThemeFor("/career-hub", settings).isCustom).toBe(false);
  });

  it("ignores query strings and trailing slashes", () => {
    expect(resolveThemeFor("/notes/?q=1", settings).id).toBe(custom.id);
  });

  it("does not let a root assignment swallow every page", () => {
    const rooted = assignRouteTheme(EMPTY_PAGE_THEME_SETTINGS, "/", "peace");

    expect(resolveThemeFor("/", rooted).id).toBe("peace");
    expect(resolveThemeFor("/library", rooted).id).toBe("reading");
  });

  it("falls back when an override names a theme that was deleted", () => {
    const stale: PageThemeSettings = { customThemes: [], routeThemes: { "/library": "custom-gone" } };

    expect(resolveThemeFor("/library", stale).id).toBe("reading");
  });

  it("resolves an unknown route to Home Base rather than nothing", () => {
    expect(resolveThemeFor("/not-a-page", EMPTY_PAGE_THEME_SETTINGS).id).toBe("home-base");
  });
});

describe("findThemeById / materialiseCustomTheme", () => {
  const custom = buildCustomTheme(draft(), null);
  const settings = upsertCustomTheme(EMPTY_PAGE_THEME_SETTINGS, custom);

  it("finds both kinds of theme", () => {
    expect(findThemeById(settings, custom.id)?.isCustom).toBe(true);
    expect(findThemeById(settings, "trading")?.isCustom).toBe(false);
    expect(findThemeById(settings, "nope")).toBeNull();
  });

  it("borrows the base theme's capture domain instead of inventing one", () => {
    const fromTrading = buildCustomTheme(draft({ baseThemeId: "trading" }), null);

    expect(materialiseCustomTheme(fromTrading).captureDomain).toBe(DOMAIN_THEMES.trading.captureDomain);
  });

  it("survives a base theme id that no longer exists", () => {
    const orphan = { ...buildCustomTheme(draft(), null), baseThemeId: "deleted-theme" };

    expect(() => materialiseCustomTheme(orphan)).not.toThrow();
  });
});
