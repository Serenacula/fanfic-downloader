import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { FFNMetadata } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../../background/request-queue.js");
const { ffnParser } = await import("../../parsers/ffn.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

describe("FFN parser — s/12345 (The Long Road Home)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("fanfiction.net/s/12345/")) return htmlResponse("ffn-story.html");
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.site).toBe("ffn");
  });

  it("extracts title and author", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("The Long Road Home");
    expect(data.core.author).toBe("QuillWriter");
  });

  it("extracts the summary", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.summary).toContain("road home is never straight");
  });

  it("fetches all chapters and extracts their titles from the select", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(2);
    expect(data.core.chapters[0]!.title).toBe("Departure");
    expect(data.core.chapters[1]!.title).toBe("Arrival");
  });

  it("extracts chapter content from #storytext", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.htmlContent).toContain("chapter content");
  });

  it("parses the compound genre Hurt/Comfort", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    const meta = data.meta as FFNMetadata;
    expect(meta.genres).toContain("Hurt/Comfort");
  });

  it("extracts rating and language", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    const meta = data.meta as FFNMetadata;
    expect(meta.rating).toBe("T");
    expect(meta.language).toBe("English");
  });

  it("extracts word count, favs, and follows", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    const meta = data.meta as FFNMetadata;
    expect(data.core.wordCount).toBe(3456);
    expect(meta.favs).toBe(42);
    expect(meta.follows).toBe(7);
  });

  it("detects complete status", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.status).toBe("complete");
  });

  it("extracts dates from data-xutime spans", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    expect(data.core.publishDate!.getFullYear()).toBe(2021);
  });

  it("builds the canonical sourceUrl from the story ID", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.sourceUrl).toContain("fanfiction.net/s/12345/");
  });

  it("fetches both chapter pages (one request per chapter)", async () => {
    await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS);
    const calls = vi.mocked(enqueue).mock.calls.map(([url]) => url);
    expect(calls.some((url) => url.includes("/s/12345/1/"))).toBe(true);
    expect(calls.some((url) => url.includes("/s/12345/2/"))).toBe(true);
  });

  it("throws for a non-FFN URL", async () => {
    await expect(ffnParser.parse("https://example.com/s/999/1/", DEFAULT_SETTINGS)).rejects.toThrow(
      "Not a valid FFN URL",
    );
  });

  it("reports per-chapter progress through onProgress", async () => {
    const onProgress = vi.fn();
    await ffnParser.parse("https://www.fanfiction.net/s/12345/1/", DEFAULT_SETTINGS, onProgress);

    expect(onProgress.mock.calls).toEqual([
      [1, 2],
      [2, 2],
    ]);
  });
});

describe("FFN parser — reverse date order", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("fanfiction.net/s/99999/"))
        return htmlResponse("ffn-story-reversed-dates.html");
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("assigns publishDate and updateDate by label, not position, when Updated appears before Published", async () => {
    const data = await ffnParser.parse("https://www.fanfiction.net/s/99999/1/", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    expect(data.core.publishDate!.getFullYear()).toBe(2022);
    expect(data.core.publishDate!.getMonth()).toBe(0); // January (0-indexed)
    expect(data.core.updateDate!.getMonth()).toBe(5); // June (0-indexed)
    // publish should be earlier than update
    expect(data.core.publishDate!.getTime()).toBeLessThan(data.core.updateDate!.getTime());
  });
});

function inlineFfnPage(summary: string, meta: string): string {
  return `<!DOCTYPE html><html><body>
    <div id="pre_story_links"><span><a href="/book/Books/">Books</a><a href="/book/Test-Universe/">Test Universe</a></span></div>
    <div id="profile_top">
      <b class="xcontrast_txt">Inline Test Story</b>
      <a class="xcontrast_txt" href="/u/1/author">InlineAuthor</a>
      <div class="xcontrast_txt">${summary}</div>
      <span class="xgray xcontrast_txt">${meta}</span>
    </div>
    <div id="storytext"><p>Chapter body text.</p></div>
  </body></html>`;
}

function mockInlineStory(html: string): void {
  vi.mocked(enqueue).mockImplementation(async (url: string) => {
    if (url.includes("fanfiction.net/s/55555/")) {
      return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
    }
    throw new Error(`Unexpected fetch: ${url}`);
  });
}

describe("FFN parser — summary escaping", () => {
  it("keeps literal angle brackets and ampersands in the summary as text, not markup", async () => {
    mockInlineStory(
      inlineFfnPage(
        "Careful with &lt;b&gt;brackets&lt;/b&gt; &amp; ampersands",
        "Rated: T - English - Chapters: 1 - Words: 100 - Complete",
      ),
    );

    const data = await ffnParser.parse("https://www.fanfiction.net/s/55555/1/", DEFAULT_SETTINGS);
    // The summary displayed literal "<b>" text on FFN; it must survive as escaped
    // text rather than becoming a real bold element or being stripped
    expect(data.core.summary).toContain("&lt;b&gt;brackets&lt;/b&gt;");
    expect(data.core.summary).toContain("&amp; ampersands");
    expect(data.core.summary).not.toContain("<b>");
  });
});

describe("FFN parser — date labels wrapped in elements", () => {
  it("finds Published/Updated labels inside elements with whitespace before the date span", async () => {
    mockInlineStory(
      inlineFfnPage(
        "A summary.",
        `Rated: T - English - Chapters: 1 - Words: 100 - ` +
          `<strong>Updated:</strong> <span data-xutime="1655294400"></span> - ` +
          `<strong>Published:</strong> <span data-xutime="1641038400"></span> - Complete`,
      ),
    );

    const data = await ffnParser.parse("https://www.fanfiction.net/s/55555/1/", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    expect(data.core.publishDate!.getFullYear()).toBe(2022);
    expect(data.core.publishDate!.getMonth()).toBe(0); // January
    expect(data.core.updateDate!.getMonth()).toBe(5); // June
  });
});

describe("FFN parser — URL detection", () => {
  it("matches story URLs with a chapter number", () => {
    expect(ffnParser.pattern.test("https://www.fanfiction.net/s/12345/1/")).toBe(true);
    expect(ffnParser.pattern.test("https://www.fanfiction.net/s/99999/3/My-Title")).toBe(true);
  });

  it("does not match user profile URLs", () => {
    expect(ffnParser.pattern.test("https://www.fanfiction.net/u/12345/Author")).toBe(false);
  });

  it("does not match community or forum pages", () => {
    expect(ffnParser.pattern.test("https://www.fanfiction.net/community/")).toBe(false);
  });
});
