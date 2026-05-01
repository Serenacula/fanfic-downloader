import { describe, it, expect, beforeEach, vi } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { SpaceBattlesMetadata } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../../background/request-queue.js");
const { spaceBattlesParser, sufficientVelocityParser } = await import("../../parsers/xenforo.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");
const BASE = "https://forums.spacebattles.com";

function htmlResponse(path: string): Response {
  return new Response(readFileSync(join(fixtureDir, path), "utf8"), {
    status: 200,
    headers: { "content-type": "text/html" },
  });
}

describe("XenForo / SpaceBattles parser — threads/a-song-of-dust.99999", () => {
  const THREAD_URL = `${BASE}/threads/a-song-of-dust.99999/`;

  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url === `${BASE}/threads/99999/threadmarks`) return htmlResponse("xenforo-threadmarks.html");
      if (url === `${BASE}/threads/99999/`) return htmlResponse("xenforo-thread.html");
      if (url.includes("post-200")) return htmlResponse("xenforo-post.html");
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect(data.site).toBe("spacebattles");
  });

  it("extracts title from h1.p-title-value", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect(data.core.title).toBe("A Song of Dust");
  });

  it("extracts author from .message-userDetails .username", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect(data.core.author).toBe("StoryWriter");
  });

  it("uses the first post as the summary", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect(data.core.summary).toContain("opening post");
  });

  it("finds all threadmarks in order", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(2);
    expect(data.core.chapters[0]!.title).toBe("Prologue");
    expect(data.core.chapters[1]!.title).toBe("Chapter One");
  });

  it("fetches chapter content via anchor-targeted post selector", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.htmlContent).toContain("Prologue chapter content");
    expect(data.core.chapters[1]!.htmlContent).toContain("Chapter one content");
  });

  it("extracts subForum from threadmarks page breadcrumbs", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect((data.meta as SpaceBattlesMetadata).subForum).toBe("Fan Fiction");
  });

  it("extracts publish and update dates from threadmark timestamps", async () => {
    const data = await spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    expect(data.core.publishDate!.getFullYear()).toBe(2024);
    expect(data.core.updateDate!.getMonth()).toBeGreaterThan(data.core.publishDate!.getMonth());
  });

  it("throws when no threadmarks are found", async () => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("threadmarks")) return new Response("<html><body></body></html>", { status: 200, headers: { "content-type": "text/html" } });
      return htmlResponse("xenforo-thread.html");
    });
    await expect(spaceBattlesParser.parse(THREAD_URL, DEFAULT_SETTINGS))
      .rejects.toThrow("No threadmarks found");
  });

  it("throws for a URL that does not match the thread pattern", async () => {
    await expect(
      spaceBattlesParser.parse(`${BASE}/members/someone.42/`, DEFAULT_SETTINGS),
    ).rejects.toThrow("Not a valid spacebattles URL");
  });
});

describe("XenForo / SpaceBattles parser — URL detection", () => {
  it("matches thread URLs", () => {
    expect(spaceBattlesParser.pattern.test(`${BASE}/threads/my-story.12345/`)).toBe(true);
    expect(spaceBattlesParser.pattern.test(`${BASE}/threads/story.99/post-1#post-1`)).toBe(true);
  });

  it("does not match member or forum index pages", () => {
    expect(spaceBattlesParser.pattern.test(`${BASE}/members/user.1/`)).toBe(false);
    expect(spaceBattlesParser.pattern.test(`${BASE}/forums/creative-writing.18/`)).toBe(false);
  });
});

describe("XenForo / SufficientVelocity parser — URL detection", () => {
  it("matches SV thread URLs and not SB URLs", () => {
    expect(sufficientVelocityParser.pattern.test(
      "https://forums.sufficientvelocity.com/threads/story.12345/",
    )).toBe(true);
    expect(sufficientVelocityParser.pattern.test(
      "https://forums.spacebattles.com/threads/story.12345/",
    )).toBe(false);
  });
});
