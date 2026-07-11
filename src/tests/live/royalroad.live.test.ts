import { describe, it, expect } from "vitest";
import { royalRoadParser } from "../../parsers/royalroad.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import { skipIfBlocked } from "./live-helpers.js";

// Pinned: "Okeanos: Returnal" — used as a fixture source, plain HTTP (no
// Cloudflare wall observed), so this is expected to actually pass in CI.
const URL = "https://www.royalroad.com/fiction/165189";

describe("RoyalRoad live", () => {
  it("parses the pinned fiction", async (ctx) => {
    try {
      const data = await royalRoadParser.parse(URL, DEFAULT_SETTINGS);
      expect(data.core.title).toBeTruthy();
      expect(data.core.chapters.length).toBeGreaterThanOrEqual(1);
      for (const chapter of data.core.chapters) {
        expect(chapter.htmlContent.length).toBeGreaterThan(0);
      }
      expect(data.core.tags.length).toBeGreaterThan(0);
    } catch (error) {
      skipIfBlocked(error, ctx);
    }
  });
});
