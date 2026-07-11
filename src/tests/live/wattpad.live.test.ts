import { describe, it, expect } from "vitest";
import { wattpadParser } from "../../parsers/wattpad.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import { skipIfBlocked } from "./live-helpers.js";

// Pinned: story/394937035 ("HIS PEACE IN CHAOS", 24 chapters). NOTE: the
// originally-proposed pin (story/410660257, inherited from the fixture set)
// turned out to be a fabricated ID that 404s against the real Wattpad API —
// the wattpad-*.html fixtures were hand-crafted synthetics, never a real GET
// dump (see plan.md W10 provenance notes). Verified live: the chapter-text
// JSON API now returns an empty body for every part (a live Wattpad API
// behavior change since this parser was written), so every chapter falls
// through to the HTML-scrape path — two requests per chapter instead of one,
// hence picking a short (24-chapter) story to stay well inside the timeout.
const URL = "https://www.wattpad.com/story/394937035";

describe("Wattpad live", () => {
  it("parses the pinned story", async (ctx) => {
    try {
      const data = await wattpadParser.parse(URL, DEFAULT_SETTINGS);
      expect(data.core.title).toBeTruthy();
      expect(data.core.chapters.length).toBeGreaterThanOrEqual(1);
      expect(data.core.chapters[0]!.htmlContent.length).toBeGreaterThan(0);
    } catch (error) {
      skipIfBlocked(error, ctx);
    }
  });
});
