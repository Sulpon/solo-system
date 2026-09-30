import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ThemeHeader from "../ThemeHeader";
import ThemeEmptyState from "../ThemeEmptyState";
import ThemeStat from "../ThemeStat";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => pathname.current }));

beforeEach(() => {
  pathname.current = "/";
});

// Verifies the route -> theme -> component path end to end, which the pure
// resolver tests cannot: that a themed component actually reads the domain
// resolved from the current route.
describe("ThemeHeader", () => {
  it("takes its eyebrow and tagline from the domain the route resolves to", () => {
    pathname.current = "/workouts";
    render(<ThemeHeader title="Training" />);

    expect(screen.getByText("Training", { selector: "p" })).toBeTruthy();
    expect(screen.getByText("Real sets, real records, real consistency.")).toBeTruthy();
  });

  it("uses a different domain's identity on a different route", () => {
    pathname.current = "/library";
    render(<ThemeHeader title="The Library" />);

    expect(screen.getByText("Library", { selector: "p" })).toBeTruthy();
  });

  it("falls back to Home Base on an unknown route instead of rendering nothing", () => {
    pathname.current = "/some-route-that-does-not-exist";
    render(<ThemeHeader title="Anything" />);

    expect(screen.getByText("Home Base", { selector: "p" })).toBeTruthy();
  });

  it("lets a page override the eyebrow and subtitle", () => {
    pathname.current = "/career-hub";
    render(<ThemeHeader title="Career Hub" eyebrow="Pipeline" subtitle="Custom line" />);

    expect(screen.getByText("Pipeline")).toBeTruthy();
    expect(screen.getByText("Custom line")).toBeTruthy();
  });

  it("renders no stats region at all when a page supplies none", () => {
    pathname.current = "/";
    const { container } = render(<ThemeHeader title="Home Base" />);

    expect(container.querySelectorAll("[data-testid]")).toHaveLength(0);
  });
});

describe("ThemeStat", () => {
  it("renders the caller's already-formatted real value verbatim", () => {
    render(<ThemeStat testId="stat" label="Sessions" value="1,204" hint="Finished workouts" />);

    expect(screen.getByText("1,204")).toBeTruthy();
    expect(screen.getByText("Finished workouts")).toBeTruthy();
  });
});

describe("ThemeEmptyState", () => {
  it("states plainly that there is nothing, and what would create data", () => {
    render(<ThemeEmptyState testId="empty" title="No personal records yet" description="Finish a workout that beats a previous best." />);

    expect(screen.getByTestId("empty")).toBeTruthy();
    expect(screen.getByText("No personal records yet")).toBeTruthy();
  });
});
