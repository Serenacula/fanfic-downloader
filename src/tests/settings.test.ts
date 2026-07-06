import { describe, it, expect } from "vitest";
import { clampRateLimitMs, DEFAULT_SETTINGS, MAX_RATE_LIMIT_MS } from "../shared/settings.js";

describe("clampRateLimitMs", () => {
  it("passes through values inside the range", () => {
    expect(clampRateLimitMs(0)).toBe(0);
    expect(clampRateLimitMs(500)).toBe(500);
    expect(clampRateLimitMs(MAX_RATE_LIMIT_MS)).toBe(MAX_RATE_LIMIT_MS);
  });

  it("clamps negative values to 0", () => {
    expect(clampRateLimitMs(-100)).toBe(0);
  });

  it("clamps oversized values to the maximum", () => {
    expect(clampRateLimitMs(999_999)).toBe(MAX_RATE_LIMIT_MS);
  });

  it("falls back to the default for NaN input", () => {
    expect(clampRateLimitMs(NaN)).toBe(DEFAULT_SETTINGS.rateLimitMs);
  });
});
