import { describe, it, expect } from "vitest";
import { ao3Parser } from "../../parsers/ao3.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import { skipIfBlocked } from "./live-helpers.js";

// Pinned: the user's own AO3 work — a stable, small, single-chapter fic that
// won't be taken down and is cheap to re-fetch weekly.
const URL = "https://archiveofourown.org/works/75693471";

describe("AO3 live", () => {
  it("parses the pinned work", async (ctx) => {
    try {
      const data = await ao3Parser.parse(URL, DEFAULT_SETTINGS);
      expect(data.core.title).toBe("The Things We Miss");
      expect(data.core.author).toBe("Serenacula");
      expect(data.core.chapters).toHaveLength(1);
      expect(data.core.chapters[0]!.htmlContent.length).toBeGreaterThan(500);
      expect(data.core.publishDate).toBeInstanceOf(Date);
    } catch (error) {
      skipIfBlocked(error, ctx);
    }
  });
});
