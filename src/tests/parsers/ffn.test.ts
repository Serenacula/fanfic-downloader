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
    await expect(ffnParser.parse("https://example.com/s/999/1/", DEFAULT_SETTINGS))
      .rejects.toThrow("Not a valid FFN URL");
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
