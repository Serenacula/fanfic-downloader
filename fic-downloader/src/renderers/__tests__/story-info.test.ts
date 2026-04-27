import { describe, it, expect } from "vitest";
import { renderStoryInfoHtml } from "../story-info.js";
import type { FicData } from "../../shared/types.js";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";

const ao3Data: FicData = {
  site: "ao3",
  core: {
    title: "Test Work",
    author: "Test Author",
    summary: "<p>A test summary.</p>",
    chapters: [],
    images: [],
    tags: ["tag1"],
    status: "complete",
    wordCount: 12345,
    publishDate: new Date("2024-01-01"),
    updateDate: new Date("2024-06-01"),
    sourceUrl: "https://archiveofourown.org/works/1",
  },
  meta: {
    fandoms: ["Test Fandom"],
    relationships: ["A/B"],
    characters: ["Character A"],
    additionalTags: ["tag1"],
    warnings: ["No Archive Warnings Apply"],
    rating: "Teen And Up Audiences",
    kudos: 500,
    bookmarks: 100,
    hits: 5000,
    language: "English",
    series: [{ name: "Test Series", part: 1 }],
  },
};

const ffnData: FicData = {
  site: "ffn",
  core: {
    title: "FFN Work",
    author: "FFN Author",
    summary: null,
    chapters: [],
    images: [],
    tags: [],
    status: "in-progress",
    wordCount: 5000,
    publishDate: null,
    updateDate: null,
    sourceUrl: "https://www.fanfiction.net/s/1/1/",
  },
  meta: {
    genres: ["Adventure", "Romance"],
    universe: "Test Universe",
    follows: 200,
    favs: 150,
    rating: "T",
    language: "English",
  },
};

describe("renderStoryInfoHtml", () => {
  it("includes title and author for AO3 data", () => {
    const html = renderStoryInfoHtml(ao3Data, DEFAULT_SETTINGS);
    expect(html).toContain("Test Work");
    expect(html).toContain("Test Author");
  });

  it("includes fandom with default settings", () => {
    const html = renderStoryInfoHtml(ao3Data, DEFAULT_SETTINGS);
    expect(html).toContain("Test Fandom");
  });

  it("hides fandom when storyInfoFields.ao3.fandoms.show is false", () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      storyInfoFields: { ao3: { fandoms: { show: false } } },
    };
    const html = renderStoryInfoHtml(ao3Data, settings);
    expect(html).not.toContain("Test Fandom");
  });

  it("renders FFN-specific fields", () => {
    const html = renderStoryInfoHtml(ffnData, DEFAULT_SETTINGS);
    expect(html).toContain("FFN Work");
    expect(html).toContain("FFN Author");
  });
});
