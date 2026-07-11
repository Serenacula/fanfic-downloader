import { describe, it, expect } from "vitest";
import {
  clampRateLimitMs,
  clampMaxConcurrent,
  DEFAULT_SETTINGS,
  MIN_RATE_LIMIT_MS,
  MAX_RATE_LIMIT_MS,
  MIN_MAX_CONCURRENT,
  MAX_MAX_CONCURRENT,
} from "../shared/settings.js";

describe("clampRateLimitMs", () => {
  it("passes through values inside the range", () => {
    expect(clampRateLimitMs(500)).toBe(500);
    expect(clampRateLimitMs(MIN_RATE_LIMIT_MS)).toBe(MIN_RATE_LIMIT_MS);
    expect(clampRateLimitMs(MAX_RATE_LIMIT_MS)).toBe(MAX_RATE_LIMIT_MS);
  });

  it("clamps values below the minimum up to the minimum", () => {
    expect(clampRateLimitMs(0)).toBe(MIN_RATE_LIMIT_MS);
    expect(clampRateLimitMs(-100)).toBe(MIN_RATE_LIMIT_MS);
  });

  it("clamps oversized values to the maximum", () => {
    expect(clampRateLimitMs(999_999)).toBe(MAX_RATE_LIMIT_MS);
  });

  it("falls back to the default for NaN input", () => {
    expect(clampRateLimitMs(NaN)).toBe(DEFAULT_SETTINGS.rateLimitMs);
  });
});

describe("clampMaxConcurrent", () => {
  it("passes through values inside the range", () => {
    expect(clampMaxConcurrent(3)).toBe(3);
    expect(clampMaxConcurrent(MIN_MAX_CONCURRENT)).toBe(MIN_MAX_CONCURRENT);
    expect(clampMaxConcurrent(MAX_MAX_CONCURRENT)).toBe(MAX_MAX_CONCURRENT);
  });

  it("clamps values below the minimum up to the minimum", () => {
    expect(clampMaxConcurrent(0)).toBe(MIN_MAX_CONCURRENT);
    expect(clampMaxConcurrent(-5)).toBe(MIN_MAX_CONCURRENT);
  });

  it("clamps oversized values to the maximum", () => {
    expect(clampMaxConcurrent(100)).toBe(MAX_MAX_CONCURRENT);
  });

  it("falls back to the default for NaN input", () => {
    expect(clampMaxConcurrent(NaN)).toBe(DEFAULT_SETTINGS.maxConcurrentDownloads);
  });
});
