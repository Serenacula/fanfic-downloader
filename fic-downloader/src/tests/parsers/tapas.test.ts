import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { TapasMetadata } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../../background/request-queue.js");
const { tapasParser } = await import("../../parsers/tapas.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

function jsonResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

const EPISODE_IDS = [
  "1527944", "3492000", "1624816", "3492037", "1682117", "3492051",
  "3493154", "3493156", "3756840", "3756842", "3763377", "3853400",
];

describe("Tapas parser — series/The-Last-Story-TLS", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("tapas.io/series/The-Last-Story-TLS/info")) {
        return htmlResponse("tapas-info.html");
      }
      if (url.includes("tapas.io/series/150240/episodes")) {
        return jsonResponse("tapas-episodes-api.json");
      }
      if (EPISODE_IDS.some((id) => url.includes(`tapas.io/episode/${id}`))) {
        return htmlResponse("tapas-episode.html");
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await tapasParser.parse("https://tapas.io/series/The-Last-Story-TLS/info", DEFAULT_SETTINGS);
    expect(data.site).toBe("tapas");
  });

  it("extracts title and author", async () => {
    const data = await tapasParser.parse("https://tapas.io/series/The-Last-Story-TLS/info", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("The Last Story");
    expect(data.core.author).toBe("Lore");
  });

  it("extracts summary", async () => {
    const data = await tapasParser.parse("https://tapas.io/series/The-Last-Story-TLS/info", DEFAULT_SETTINGS);
    expect(data.core.summary).not.toBeNull();
    expect(data.core.summary!.length).toBeGreaterThan(0);
  });

  it("finds all 12 episodes", async () => {
    const data = await tapasParser.parse("https://tapas.io/series/The-Last-Story-TLS/info", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(12);
  });

  it("extracts chapter content", async () => {
    const data = await tapasParser.parse("https://tapas.io/series/The-Last-Story-TLS/info", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.htmlContent.length).toBeGreaterThan(100);
  });

  it("extracts chapter titles", async () => {
    const data = await tapasParser.parse("https://tapas.io/series/The-Last-Story-TLS/info", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.title).toBeTruthy();
    expect(data.core.chapters[0]!.title).not.toBe("Untitled");
  });

  it("extracts Tapas-specific metadata", async () => {
    const data = await tapasParser.parse("https://tapas.io/series/The-Last-Story-TLS/info", DEFAULT_SETTINGS);
    const meta = data.meta as TapasMetadata;
    expect(meta.genre).not.toBeNull();
  });
});
