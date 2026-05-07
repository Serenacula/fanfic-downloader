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
const { fictionPressParser } = await import("../../parsers/ffn.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

// FictionPress uses identical HTML structure to FFN — reuse the FFN fixture.
describe("FictionPress parser — s/12345 (The Long Road Home)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("fictionpress.com/s/12345/")) return htmlResponse("ffn-story.html");
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the fictionpress site identifier", async () => {
    const data = await fictionPressParser.parse("https://www.fictionpress.com/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.site).toBe("fictionpress");
  });

  it("extracts title and author", async () => {
    const data = await fictionPressParser.parse("https://www.fictionpress.com/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("The Long Road Home");
    expect(data.core.author).toBe("QuillWriter");
  });

  it("extracts word count, favs, and follows", async () => {
    const data = await fictionPressParser.parse("https://www.fictionpress.com/s/12345/1/", DEFAULT_SETTINGS);
    const meta = data.meta as FFNMetadata;
    expect(data.core.wordCount).toBe(3456);
    expect(meta.favs).toBe(42);
    expect(meta.follows).toBe(7);
  });

  it("detects complete status", async () => {
    const data = await fictionPressParser.parse("https://www.fictionpress.com/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.status).toBe("complete");
  });

  it("builds the canonical sourceUrl from the story ID", async () => {
    const data = await fictionPressParser.parse("https://www.fictionpress.com/s/12345/1/", DEFAULT_SETTINGS);
    expect(data.core.sourceUrl).toContain("fictionpress.com/s/12345/");
  });

  it("fetches all chapter pages", async () => {
    await fictionPressParser.parse("https://www.fictionpress.com/s/12345/1/", DEFAULT_SETTINGS);
    const calls = vi.mocked(enqueue).mock.calls.map(([url]) => url);
    expect(calls.some((url) => url.includes("/s/12345/1/"))).toBe(true);
    expect(calls.some((url) => url.includes("/s/12345/2/"))).toBe(true);
  });

  it("throws for a non-FictionPress URL", async () => {
    await expect(fictionPressParser.parse("https://example.com/s/999/1/", DEFAULT_SETTINGS))
      .rejects.toThrow("Not a valid FictionPress URL");
  });
});

describe("FictionPress parser — URL detection", () => {
  it("matches FictionPress story URLs", () => {
    expect(fictionPressParser.pattern.test("https://www.fictionpress.com/s/12345/1/")).toBe(true);
    expect(fictionPressParser.pattern.test("https://www.fictionpress.com/s/99/")).toBe(true);
  });

  it("does not match FFN or other URLs", () => {
    expect(fictionPressParser.pattern.test("https://www.fanfiction.net/s/12345/1/")).toBe(false);
    expect(fictionPressParser.pattern.test("https://archiveofourown.org/works/12345")).toBe(false);
  });
});
