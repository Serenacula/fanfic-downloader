import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { AO3Metadata } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../../background/request-queue.js");
const { ao3Parser } = await import("../../parsers/ao3.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

describe("AO3 parser — works/75693471 (The Things We Miss)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("archiveofourown.org/works/75693471")) return htmlResponse("ao3-work.html");
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    expect(data.site).toBe("ao3");
  });

  it("extracts title and author", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("The Things We Miss");
    expect(data.core.author).toBe("Serenacula");
  });

  it("extracts summary", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    expect(data.core.summary).not.toBeNull();
    expect(data.core.summary!.length).toBeGreaterThan(0);
  });

  it("extracts chapter content", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(1);
    expect(data.core.chapters[0]!.htmlContent.length).toBeGreaterThan(100);
  });

  it("extracts AO3-specific metadata", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    const meta = data.meta as AO3Metadata;
    expect(meta.fandoms.length).toBeGreaterThan(0);
    expect(meta.rating).toBe("General Audiences");
  });

  it("extracts dates", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
  });

  it("extracts word count", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    expect(data.core.wordCount).toBeGreaterThan(0);
  });
});
