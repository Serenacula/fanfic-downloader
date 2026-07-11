import { describe, it, expect } from "vitest";
import { spaceBattlesParser } from "../../parsers/xenforo.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import { skipIfBlocked } from "./live-helpers.js";

// Pinned: "Worm" discussion/threadmark thread on SpaceBattles — one of the
// most famous, stable, unlikely-to-vanish serials on the site, chosen for
// durability over brevity (it has a large threadmark count). SpaceBattles is
// Cloudflare-walled for most datacenter IPs, so this is EXPECTED to skip in
// CI almost every time — the generous timeout covers the rare unblocked run
// where every threadmark gets fetched at the default rate limit.
const URL = "https://forums.spacebattles.com/threads/worm.161737/";

describe("SpaceBattles (XenForo) live", () => {
  it("parses the pinned thread", async (ctx) => {
    try {
      const data = await spaceBattlesParser.parse(URL, DEFAULT_SETTINGS);
      expect(data.core.title).toBeTruthy();
      expect(data.core.chapters.length).toBeGreaterThanOrEqual(1);
    } catch (error) {
      skipIfBlocked(error, ctx);
    }
  }, 300_000);
});
