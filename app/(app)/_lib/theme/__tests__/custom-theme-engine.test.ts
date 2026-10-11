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
  addWallpaper,
  assignRouteWallpaper,
  clampBlur,
  clampDim,
  removeWallpaper,
  resolveWallpaperFor,
  validateDraft,
  type CustomThemeDraft,
} from "../custom-theme-engine";
import { DOMAIN_THEMES } from "../domain-themes";
import { EMPTY_PAGE_THEME_SETTINGS, type PageThemeSettings, type Wallpaper } from "../../types/custom-theme";

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
    ...EMPTY_PAGE_THEME_SETTINGS,
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
    const stale: PageThemeSettings = { ...EMPTY_PAGE_THEME_SETTINGS, routeThemes: { "/library": "custom-gone" } };

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

function wallpaper(id: string, overrides: Partial<Wallpaper> = {}): Wallpaper {
  return { id, fileName: `${id}.jpg`, fileType: "image/jpeg", fileSize: 1024, addedAt: "2026-10-11T00:00:00.000Z", fit: "cover", dim: 0.55, blur: 0, ...overrides };
}

describe("wallpapers", () => {
  const forest = wallpaper("wp-forest");
  const city = wallpaper("wp-city");
  let settings = addWallpaper(addWallpaper(EMPTY_PAGE_THEME_SETTINGS, forest), city);
  settings = assignRouteWallpaper(settings, "/notes", forest.id);
  settings = assignRouteWallpaper(settings, "/career-hub", city.id);
  settings = assignRouteWallpaper(settings, "/career-hub/applications", forest.id);

  it("has none until one is assigned", () => {
    expect(resolveWallpaperFor("/goals", settings)).toBeNull();
    expect(resolveWallpaperFor("/notes", EMPTY_PAGE_THEME_SETTINGS)).toBeNull();
  });

  it("returns the picture pinned to a page", () => {
    expect(resolveWallpaperFor("/notes", settings)?.id).toBe(forest.id);
  });

  it("covers child routes, longest prefix winning", () => {
    expect(resolveWallpaperFor("/career-hub/companies", settings)?.id).toBe(city.id);
    expect(resolveWallpaperFor("/career-hub/applications", settings)?.id).toBe(forest.id);
  });

  it("ignores a trailing slash and a query string", () => {
    expect(resolveWallpaperFor("/notes/?x=1", settings)?.id).toBe(forest.id);
  });

  it("does not let a root assignment cover every page", () => {
    const rooted = assignRouteWallpaper(EMPTY_PAGE_THEME_SETTINGS, "/", forest.id);
    const withPicture = addWallpaper(rooted, forest);

    expect(resolveWallpaperFor("/", withPicture)?.id).toBe(forest.id);
    expect(resolveWallpaperFor("/notes", withPicture)).toBeNull();
  });

  it("resolves to nothing when the assignment points at a deleted picture", () => {
    const stale = assignRouteWallpaper(EMPTY_PAGE_THEME_SETTINGS, "/notes", "wp-gone");

    expect(resolveWallpaperFor("/notes", stale)).toBeNull();
  });

  it("releases the pages using a wallpaper it removes, and leaves the others", () => {
    const after = removeWallpaper(settings, forest.id);

    expect(after.wallpapers.map((entry) => entry.id)).toEqual([city.id]);
    expect(after.routeWallpapers).toEqual({ "/career-hub": city.id });
  });

  it("clears an assignment without touching the picture", () => {
    const after = assignRouteWallpaper(settings, "/notes", null);

    expect(after.routeWallpapers["/notes"]).toBeUndefined();
    expect(after.wallpapers).toHaveLength(2);
  });

  it("replaces a wallpaper edited in place rather than adding a duplicate", () => {
    const after = addWallpaper(settings, { ...forest, dim: 0.8 });

    expect(after.wallpapers).toHaveLength(2);
    expect(after.wallpapers.find((entry) => entry.id === forest.id)?.dim).toBe(0.8);
  });

  it("keeps themes and wallpapers independent on the same page", () => {
    const themed = assignRouteTheme(settings, "/notes", "trading");

    expect(resolveThemeFor("/notes", themed).id).toBe("trading");
    expect(resolveWallpaperFor("/notes", themed)?.id).toBe(forest.id);
  });

  it("clamps dim to a readable range and blur to something sane", () => {
    expect(clampDim(-1)).toBe(0);
    expect(clampDim(5)).toBe(0.95);
    expect(clampDim(Number.NaN)).toBe(0.55);
    expect(clampBlur(-4)).toBe(0);
    expect(clampBlur(1000)).toBe(40);
    expect(clampBlur(7.6)).toBe(8);
  });
});
