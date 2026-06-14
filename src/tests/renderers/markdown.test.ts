import { describe, it, expect, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { FicData } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

// fetchCoverImage returns null when enqueue is not set up — that's fine for these tests
const { renderMarkdown } = await import("../../renderers/markdown.js");

function makeFicData(title: string): FicData {
  return {
    site: "ao3",
    core: {
      title,
      author: "Test Author",
      summary: null,
      chapters: [{ index: 0, title: null, htmlContent: "<p>Content</p>" }],
      images: [],
      tags: [],
      status: "unknown",
      wordCount: null,
      publishDate: null,
      updateDate: null,
      coverImageUrl: null,
      sourceUrl: "https://archiveofourown.org/works/1",
    },
    meta: {
      fandoms: [],
      relationships: [],
      characters: [],
      additionalTags: [],
      warnings: [],
      rating: null,
      kudos: null,
      bookmarks: null,
      hits: null,
      language: null,
      series: [],
    },
  };
}

describe("buildFrontmatter — YAML scalar escaping", () => {
  it("escapes newlines in the title as \\n rather than emitting a literal newline", async () => {
    const settings = { ...DEFAULT_SETTINGS, includeCoverPage: true, includeCoverImage: false, includeToc: false };
    const data = makeFicData("Line One\nLine Two");
    const blob = await renderMarkdown(data, settings);
    const text = await blob.text();
    // The title YAML line must contain \n (escaped), not a real newline inside the quoted value
    expect(text).toContain('title: "Line One\\nLine Two"');
    // Ensure there is no raw newline between "Line One" and "Line Two" inside the quoted scalar
    expect(text).not.toMatch(/title: "Line One\nLine Two"/);
  });

  it("escapes backslashes in the title so the YAML value is valid", async () => {
    const settings = { ...DEFAULT_SETTINGS, includeCoverPage: true, includeCoverImage: false, includeToc: false };
    const data = makeFicData('Path\\to\\story');
    const blob = await renderMarkdown(data, settings);
    const text = await blob.text();
    // Each backslash must be doubled so the YAML scalar is legal
    expect(text).toContain('title: "Path\\\\to\\\\story"');
  });

  it("escapes double-quotes in the title so the YAML value is valid", async () => {
    const settings = { ...DEFAULT_SETTINGS, includeCoverPage: true, includeCoverImage: false, includeToc: false };
    const data = makeFicData('She said "hello"');
    const blob = await renderMarkdown(data, settings);
    const text = await blob.text();
    expect(text).toContain('title: "She said \\"hello\\""');
  });
});
