import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { ScribbleHubMetadata } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../../background/request-queue.js");
const { scribbleHubParser } = await import("../../parsers/scribblehub.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

const CHAPTER_URLS = [
  "https://www.scribblehub.com/read/2313252-the-last-silence/chapter/2314736/",
  "https://www.scribblehub.com/read/2313252-the-last-silence/chapter/2314737/",
];

describe("ScribbleHub parser — series/2313252 (The Last Silence)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string, init?: RequestInit) => {
      if (url.includes("scribblehub.com/series/2313252") && !url.includes("stats")) {
        return htmlResponse("scribblehub-series.html");
      }
      if (url.includes("admin-ajax.php")) {
        // Verify correct POST params
        const body = init?.body as string ?? "";
        if (!body.includes("wi_getreleases_long") || !body.includes("2313252")) {
          throw new Error(`Unexpected AJAX params: ${body}`);
        }
        return htmlResponse("scribblehub-toc.html");
      }
      if (url.includes("series/2313252") && url.includes("/stats")) {
        return htmlResponse("scribblehub-stats.html");
      }
      if (CHAPTER_URLS.some((u) => url.includes(u.split("scribblehub.com")[1]!))) {
        return htmlResponse("scribblehub-chapter.html");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.site).toBe("scribblehub");
  });

  it("extracts title and author", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("The Last Silence");
    expect(data.core.author).toBe("ImadChelloufi");
  });

  it("extracts summary", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.summary).not.toBeNull();
    expect(data.core.summary!.length).toBeGreaterThan(20);
  });

  it("extracts ongoing status", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.status).toBe("in-progress");
  });

  it("extracts genres and tags", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    const meta = data.meta as ScribbleHubMetadata;
    expect(meta.genres).toContain("Fantasy");
    expect(data.core.tags).toContain("Apocalypse");
    expect(data.core.tags).toContain("Dystopia");
  });

  it("extracts views and favorites from .fic_stats", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    const meta = data.meta as ScribbleHubMetadata;
    expect(meta.views).toBe(21);
    expect(meta.favorites).toBe(3);
  });

  it("finds all chapters from AJAX TOC in reading order", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(2);
    expect(data.core.chapters[0]!.title).toContain("Chapter 01");
    expect(data.core.chapters[1]!.title).toContain("Chapter 02");
  });

  it("extracts chapter content from #chp_raw", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.htmlContent).toContain("Biological War");
  });

  it("extracts dates from chapter TOC dates", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    expect(data.core.publishDate!.getFullYear()).toBe(2026);
  });

  it("fetches word count from stats page table", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.wordCount).toBe(7705);
  });

  it("resolves correctly when entered from a chapter URL", async () => {
    const data = await scribbleHubParser.parse(
      "https://www.scribblehub.com/read/2313252-the-last-silence/chapter/2313268/",
      DEFAULT_SETTINGS,
    );
    expect(data.site).toBe("scribblehub");
    expect(data.core.title).toBe("The Last Silence");
    expect(data.core.chapters).toHaveLength(2);
  });
});

describe("ScribbleHub parser — static TOC fallback", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("scribblehub.com/series/2313252") && !url.includes("stats")) {
        return htmlResponse("scribblehub-series.html");
      }
      if (url.includes("admin-ajax.php")) {
        return new Response("", { status: 500 });
      }
      if (url.includes("series/2313252") && url.includes("/stats")) {
        return htmlResponse("scribblehub-stats.html");
      }
      if (CHAPTER_URLS.some((u) => url.includes(u.split("scribblehub.com")[1]!))) {
        return htmlResponse("scribblehub-chapter.html");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("falls back to series page TOC when AJAX fails", async () => {
    const data = await scribbleHubParser.parse("https://www.scribblehub.com/series/2313252/the-last-silence/", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(2);
    expect(data.core.chapters[0]!.title).toContain("Chapter 01");
    expect(data.core.chapters[1]!.title).toContain("Chapter 02");
  });
});

describe("ScribbleHub parser — URL detection", () => {
  it("matches series page URLs", () => {
    expect(scribbleHubParser.pattern.test("https://www.scribblehub.com/series/2313252/the-last-silence/")).toBe(true);
    expect(scribbleHubParser.pattern.test("https://www.scribblehub.com/series/2313252/")).toBe(true);
  });

  it("matches chapter reader URLs", () => {
    expect(scribbleHubParser.pattern.test("https://www.scribblehub.com/read/2313252-the-last-silence/chapter/2314736/")).toBe(true);
  });

  it("does not match profile or other pages", () => {
    expect(scribbleHubParser.pattern.test("https://www.scribblehub.com/profile/259832/imadchelloufi/")).toBe(false);
    expect(scribbleHubParser.pattern.test("https://www.scribblehub.com/")).toBe(false);
  });
});
