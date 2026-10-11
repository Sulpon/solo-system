import { describe, expect, it } from "vitest";
import { ENVIRONMENTS, environmentObjectPosition, environmentSrc, resolveEnvironment, resolveRouteEnvironment, ROUTE_ENVIRONMENTS } from "../environments";
import { DOMAIN_THEMES } from "../domain-themes";

describe("the registry", () => {
  it("names a file for every environment, with no duplicates", () => {
    const all = [...Object.values(ENVIRONMENTS), ...ROUTE_ENVIRONMENTS.map((entry) => entry.environment)];
    const files = all.map((entry) => entry.file);

    expect(files.every((file) => file.endsWith(".webp"))).toBe(true);
    expect(new Set(files).size).toBe(files.length);
  });

  it("keeps every overlay dark enough to read white text over, and short of fully black", () => {
    for (const environment of Object.values(ENVIRONMENTS)) {
      expect(environment.overlay).toBeGreaterThanOrEqual(0.4);
      expect(environment.overlay).toBeLessThan(1);
    }
  });

  it("only keys theme environments by themes that actually exist", () => {
    for (const id of Object.keys(ENVIRONMENTS)) {
      expect(DOMAIN_THEMES[id as keyof typeof DOMAIN_THEMES]).toBeDefined();
    }
  });

  it("builds a path under the public environments folder", () => {
    expect(environmentSrc(ENVIRONMENTS["home-base"])).toBe("/images/atlas/environments/home-base.webp");
  });
});

describe("resolveEnvironment", () => {
  it("gives Mission Control the home-base environment", () => {
    expect(resolveEnvironment("/", "home-base")?.file).toBe("home-base.webp");
  });

  // The reason route keys exist: /quests has no theme of its own, so
  // without one it would resolve to home-base and the two pages would
  // share a single image.
  it("gives Quests its own environment even though it inherits the home-base theme", () => {
    const quests = resolveEnvironment("/quests", "home-base");

    expect(quests?.file).toBe("quests.webp");
    expect(quests?.file).not.toBe(resolveEnvironment("/", "home-base")?.file);
  });

  it("covers child routes of a route environment", () => {
    expect(resolveEnvironment("/quests/anything", "home-base")?.id).toBe("quests");
  });

  it("ignores a trailing slash and a query string", () => {
    expect(resolveRouteEnvironment("/quests/?filter=today")?.id).toBe("quests");
  });

  it("falls back to the theme where no route claims the page", () => {
    expect(resolveEnvironment("/library", "reading")?.file).toBe("reading.webp");
    expect(resolveEnvironment("/workouts", "calisthenics")?.file).toBe("calisthenics.webp");
  });

  it("lets a custom theme inherit the environment of the theme it was based on", () => {
    expect(resolveEnvironment("/library", "custom-abc", "trading")?.file).toBe("trading.webp");
  });

  it("resolves to nothing for a theme with no environment and no route entry", () => {
    expect(resolveEnvironment("/somewhere", "not-a-theme")).toBeNull();
  });

  it("does not let a route entry leak onto an unrelated page", () => {
    expect(resolveRouteEnvironment("/goals")).toBeNull();
    expect(resolveRouteEnvironment("/quests-archive")).toBeNull();
  });
});

describe("environmentObjectPosition", () => {
  it("maps each crop to a CSS object-position", () => {
    expect(environmentObjectPosition("center")).toBe("50% 50%");
    expect(environmentObjectPosition("top")).toBe("50% 0%");
    expect(environmentObjectPosition("bottom")).toBe("50% 100%");
    expect(environmentObjectPosition("left")).toBe("0% 50%");
    expect(environmentObjectPosition("right")).toBe("100% 50%");
  });
});
