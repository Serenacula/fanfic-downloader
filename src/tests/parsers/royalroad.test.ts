import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { RoyalRoadMetadata } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../../background/request-queue.js");
const { royalRoadParser } = await import("../../parsers/royalroad.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

describe("RoyalRoad parser — fiction/165189 (Okeanos: Returnal)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("royalroad.com/fiction/165189") && !url.includes("/chapter/")) {
        return htmlResponse("rr-fiction.html");
      }
      if (url.includes("royalroad.com/fiction/165189/okeanos-returnal/chapter/")) {
        return htmlResponse("rr-chapter.html");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    expect(data.site).toBe("royalroad");
  });

  it("extracts title and author", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    expect(data.core.title).toContain("Okeanos");
    expect(data.core.author).not.toBe("Unknown");
    expect(data.core.author.length).toBeGreaterThan(0);
  });

  it("extracts summary", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    expect(data.core.summary).not.toBeNull();
    expect(data.core.summary!.length).toBeGreaterThan(0);
  });

  it("extracts chapter content", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(1);
    expect(data.core.chapters[0]!.htmlContent.length).toBeGreaterThan(100);
  });

  it("extracts dates", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
  });

  it("extracts RoyalRoad-specific metadata", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    const meta = data.meta as RoyalRoadMetadata;
    expect(meta.tags.length).toBeGreaterThan(0);
    expect(meta.tags).toContain("Urban Fantasy");
  });

  it("extracts word count", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    expect(data.core.wordCount).toBeGreaterThan(0);
  });
});
