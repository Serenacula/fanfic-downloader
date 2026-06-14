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

// Fixture: real AO3 page dump of works/80642696 ("A Villain By Any Other Name..." by Silvia_Goddess_of_Being_Right)
// 5-chapter completed work; Chapter 2 has pre-chapter author notes; all chapters have end notes.
describe("AO3 parser — multi-chapter work (works/80642696)", () => {
  beforeEach(() => {
    vi.mocked(enqueue).mockImplementation(async (url: string) => {
      if (url.includes("archiveofourown.org/works/80642696")) return htmlResponse("ao3-multichapter.html");
      throw new Error(`Unexpected fetch: ${url}`);
    });
  });

  it("extracts title and author", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS);
    expect(data.core.title).toBe("A Villain By Any Other Name...");
    expect(data.core.author).toBe("Silvia_Goddess_of_Being_Right");
  });

  it("extracts all 5 chapters", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(5);
  });

  it("extracts chapter titles", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.title).toBe("Clockblocker");
    expect(data.core.chapters[1]!.title).toBe("Kid Win");
  });

  it("extracts chapter body content", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS);
    expect(data.core.chapters[0]!.htmlContent).toContain("Dennis is tired.");
    expect(data.core.chapters[1]!.htmlContent).toContain("Armsmaster got kicked out");
  });

  it("excludes author notes by default", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS);
    // Chapter 1 end notes
    expect(data.core.chapters[0]!.htmlContent).not.toContain("Wrote this fic after rereading");
    // Chapter 2 pre-notes
    expect(data.core.chapters[1]!.htmlContent).not.toContain("Another round of thanks to HQM");
  });

  it("includes author notes when the setting is enabled", async () => {
    const settings = { ...DEFAULT_SETTINGS, includeAuthorNotes: true };
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", settings);
    // Chapter 1 end notes
    expect(data.core.chapters[0]!.htmlContent).toContain("Wrote this fic after rereading");
    // Chapter 2 pre-notes
    expect(data.core.chapters[1]!.htmlContent).toContain("Another round of thanks to HQM");
  });

  it("extracts publish and update dates", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS);
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    // Published 2026-03-04, Completed 2026-03-08
    expect(data.core.publishDate!.getFullYear()).toBe(2026);
    expect(data.core.updateDate!.getFullYear()).toBe(2026);
  });
});

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
    expect(data.core.summary).toContain("Praem is not quite as mature");
  });

  it("extracts chapter content", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    expect(data.core.chapters).toHaveLength(1);
    expect(data.core.chapters[0]!.htmlContent).toContain("It was quite late");
  });

  it("extracts AO3-specific metadata", async () => {
    const data = await ao3Parser.parse("https://archiveofourown.org/works/75693471", DEFAULT_SETTINGS);
    const meta = data.meta as AO3Metadata;
    expect(meta.fandoms).toContain("Katalepsis - Hungry");
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
