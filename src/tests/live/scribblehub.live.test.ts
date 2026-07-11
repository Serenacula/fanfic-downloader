import { describe, it, expect } from "vitest";
import { scribbleHubParser } from "../../parsers/scribblehub.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import { skipIfBlocked } from "./live-helpers.js";

// Pinned: series/2313252 (fixture source). ScribbleHub is Cloudflare-walled
// for most datacenter IPs — this is EXPECTED to skip in CI and often pass
// when run from a residential IP.
const URL = "https://www.scribblehub.com/series/2313252/";

describe("ScribbleHub live", () => {
  it("parses the pinned series", async (ctx) => {
    try {
      const data = await scribbleHubParser.parse(URL, DEFAULT_SETTINGS);
      expect(data.core.title).toBeTruthy();
      expect(data.core.chapters.length).toBeGreaterThanOrEqual(1);
    } catch (error) {
      skipIfBlocked(error, ctx);
    }
  });
});
