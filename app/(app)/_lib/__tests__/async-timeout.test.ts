import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TimeoutError, withTimeout } from "../async-timeout";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("withTimeout", () => {
  it("resolves with the real value when the promise settles before the timeout", async () => {
    const promise = Promise.resolve("real value");

    const result = await withTimeout(promise, 5000);

    expect(result).toBe("real value");
  });

  it("rejects with the real error when the promise rejects before the timeout", async () => {
    const promise = Promise.reject(new Error("real failure"));

    await expect(withTimeout(promise, 5000)).rejects.toThrow("real failure");
  });

  it("rejects with a TimeoutError once the timeout elapses and the promise never settles", async () => {
    const neverSettles = new Promise<string>(() => {});

    const resultPromise = withTimeout(neverSettles, 5000, "test operation");
    const assertion = expect(resultPromise).rejects.toBeInstanceOf(TimeoutError);

    await vi.advanceTimersByTimeAsync(5000);
    await assertion;
  });

  it("includes the operation label and timeout duration in the TimeoutError message", async () => {
    const neverSettles = new Promise<string>(() => {});

    const resultPromise = withTimeout(neverSettles, 3000, "my slow call");
    const assertion = expect(resultPromise).rejects.toThrow("my slow call did not complete within 3000ms");

    await vi.advanceTimersByTimeAsync(3000);
    await assertion;
  });

  it("does not fire the timeout if the promise resolves first (no dangling timer error)", async () => {
    const promise = new Promise<string>((resolve) => {
      setTimeout(() => resolve("resolved early"), 1000);
    });

    const resultPromise = withTimeout(promise, 5000);
    await vi.advanceTimersByTimeAsync(1000);

    const result = await resultPromise;
    expect(result).toBe("resolved early");

    // Advancing well past the original timeout must not throw/reject
    // anything further - the timer was cleared once the real promise won.
    await vi.advanceTimersByTimeAsync(10000);
  });

  it("accepts a Supabase-style thenable (PromiseLike, not a real Promise instance)", async () => {
    const thenable: PromiseLike<number> = {
      then(onFulfilled) {
        return Promise.resolve(42).then(onFulfilled);
      },
    };

    const result = await withTimeout(thenable, 5000);

    expect(result).toBe(42);
  });
});
