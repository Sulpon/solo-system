import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// @testing-library/react's automatic afterEach cleanup only self-registers
// under Jest; Vitest needs this wired explicitly, or DOM from one test leaks
// into the next (duplicate elements, stale state) - every test here renders
// via render(), so this must run after every single test.
afterEach(cleanup);
