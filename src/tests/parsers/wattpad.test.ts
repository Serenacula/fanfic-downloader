import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { WattpadMetadata } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../../background/request-queue.js");
const { wattpadParser } = await import("../../parsers/wattpad.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

function jsonResponse(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const STORY_API = {
  title: "The First Rain of May",
  user: { name: "jeng delacruz" },
  description: "After fleeing a violent ambush, a merchant's daughter takes shelter with a mysterious healer in the forest.",
  completed: false,
  mainCategory: "General Fiction",
  tags: ["1800s", "darkfantasy", "fantasy-romance", "kitsune", "sapphic", "slowburn"],
  readCount: 27,
  voteCount: 0,
  parts: [
    {
      id: "1625014783",
      title: "Prologue",
      url: "https://www.wattpad.com/1625014783",
      createDate: "2026-04-27T00:00:00Z",
    },
  ],
};

const CHAPTER_TEXT_API = {
  text: "<p>The bukot was dim even amidst the morning sun outside.</p><p>The three-tailed fox curled tighter when it heard footsteps climbing the wooden ladder.</p>",
};

describe("Wattpad parser — story/410660257 (The First Rain of May)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("wattpad.com/story/410660257") && !url.includes("api/")) {
        return htmlResponse("wattpad-story.html");
      }
      if (url.includes("api/v3/stories/410660257")) {
        return jsonResponse(STORY_API);
      }
      if (url.includes("api/v3/story_parts/1625014783")) {
        return jsonResponse(CHAPTER_TEXT_API);
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.site).toBe("wattpad");
  });

  it("extracts title and author from API", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("The First Rain of May");
    expect(data.core.author).toBe("jeng delacruz");
  });

  it("extracts summary", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.summary).not.toBeNull();
    expect(data.core.summary!.length).toBeGreaterThan(20);
  });

  it("extracts status from completed flag", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.status).toBe("in-progress");
  });

  it("extracts tags from API without platform noise", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.tags).toContain("1800s");
    expect(data.core.tags).toContain("sapphic");
    expect(data.core.tags).not.toContain("eBooks");
    expect(data.core.tags).not.toContain("reading");
    expect(data.core.tags).not.toContain("fiction");
  });

  it("extracts cover image from JSON-LD when not in og:image", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.coverImageUrl).toContain("img.wattpad.com");
  });

  it("extracts dates from JSON-LD", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    expect(data.core.publishDate!.getFullYear()).toBe(2026);
  });

  it("finds the correct number of chapters", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(1);
  });

  it("extracts chapter content from API text", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.title).toBe("Prologue");
    expect(data.core.chapters[0]!.htmlContent.length).toBeGreaterThan(50);
  });

  it("extracts Wattpad-specific metadata", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    const meta = data.meta as WattpadMetadata;
    expect(meta.genre).toBe("General Fiction");
    expect(meta.reads).toBe(27);
    expect(meta.votes).toBe(0);
  });
});

describe("Wattpad parser — HTML fallback (no API)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("wattpad.com/story/410660257") && !url.includes("api/")) {
        return htmlResponse("wattpad-story.html");
      }
      if (url.includes("api/v3/stories/410660257")) {
        return new Response(null, { status: 500 });
      }
      if (url.includes("api/v3/story_parts/1625014783")) {
        return new Response(null, { status: 500 });
      }
      if (url.includes("wattpad.com/1625014783")) {
        return htmlResponse("wattpad-chapter.html");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("falls back to HTML metadata when API fails", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("The First Rain of May");
    expect(data.core.author).toBe("jeng delacruz");
  });

  it("falls back to p[data-p-id] chapter content when API fails", async () => {
    const data = await wattpadParser.parse("https://www.wattpad.com/story/410660257-the-first-rain-of-may", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.htmlContent).toContain("bukot");
  });
});
