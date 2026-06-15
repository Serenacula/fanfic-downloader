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

function inlineHtmlResponse(html: string): Response {
  return new Response(html, {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

describe("RoyalRoad parser — extractChapterListing filters locked rows", () => {
  it("skips rows with no chapter link and returns only rows with valid links", async () => {
    const fictionHtml = readFileSync(join(fixtureDir, "rr-fiction.html"), "utf8");
    const lockedRow = `<tr class="chapter-row">
      <td><span class="locked">Patreon Only</span></td>
      <td class="text-right"><time datetime="2026-05-01T00:00:00.0000000+00:00">2 days ago</time></td>
    </tr>`;
    const patchedHtml = fictionHtml.replace("</tbody>", `${lockedRow}</tbody>`);

    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("royalroad.com/fiction/165189") && !url.includes("/chapter/")) {
        return inlineHtmlResponse(patchedHtml);
      }
      if (url.includes("royalroad.com/fiction/165189/okeanos-returnal/chapter/")) {
        return htmlResponse("rr-chapter.html");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    const data = await royalRoadParser.parse(
      "https://www.royalroad.com/fiction/165189/okeanos-returnal",
      DEFAULT_SETTINGS,
    );
    expect(data.core.chapters).toHaveLength(1);
    expect(data.core.chapters[0]!.htmlContent.length).toBeGreaterThan(0);
  });
});

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
    expect(data.core.title).toBe("Okeanos Returnal");
    expect(data.core.author).toBe("qualiap");
  });

  it("extracts summary", async () => {
    const data = await royalRoadParser.parse("https://www.royalroad.com/fiction/165189/okeanos-returnal", DEFAULT_SETTINGS);
    expect(data.core.summary).toContain("Lorenz Phis");
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
