import { describe, it, expect } from "vitest";
import { tapasParser } from "../../parsers/tapas.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import { skipIfBlocked } from "./live-helpers.js";

// Pinned: "The Last Story" — used as a fixture source. Episode count only
// grows over time, so >= is the correct assertion, not an exact count.
// Timing note: ~12+ sequential episode fetches at the 500ms default rate
// limit is tight against the 60s test timeout — if this flakes on time,
// raise this file's timeout rather than weakening the rate limit.
const URL = "https://tapas.io/series/The-Last-Story-TLS/info";

describe("Tapas live", () => {
  it("parses the pinned series", async (ctx) => {
    try {
      const data = await tapasParser.parse(URL, DEFAULT_SETTINGS);
      expect(data.core.title).toBe("The Last Story");
      expect(data.core.chapters.length).toBeGreaterThanOrEqual(12);
    } catch (error) {
      skipIfBlocked(error, ctx);
    }
  });
});
