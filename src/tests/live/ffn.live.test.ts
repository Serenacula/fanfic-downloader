import { describe, it, expect } from "vitest";
import { ffnParser } from "../../parsers/ffn.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import { skipIfBlocked } from "./live-helpers.js";

// Pinned: "Harry Potter and the Methods of Rationality" — chosen for
// durability (one of the most stable, unlikely-to-vanish fics that exists),
// not brevity: it has 122 chapters. FFN is Cloudflare-walled for most
// datacenter IPs, so this is EXPECTED to skip in CI almost every time — but
// on the rare unblocked run, 122 sequential chapter fetches at the default
// rate limit need far more than the file's normal 60s budget.
const URL = "https://www.fanfiction.net/s/5782108/1/";

describe("FanFiction.net live", () => {
  it("parses the pinned story", async (ctx) => {
    try {
      const data = await ffnParser.parse(URL, DEFAULT_SETTINGS);
      expect(data.core.title).toBeTruthy();
      expect(data.core.chapters.length).toBeGreaterThanOrEqual(1);
    } catch (error) {
      skipIfBlocked(error, ctx);
    }
  }, 180_000);
});
