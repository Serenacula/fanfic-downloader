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

const { ao3Parser } = await import("../../parsers/ao3.js");

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../fixtures");

function fixtureText(path: string): string {
  return readFileSync(join(fixtureDir, path), "utf8");
}

function proxyResponse(path: string): { ok: boolean; status: number; text: string } {
  return { ok: true, status: 200, text: fixtureText(path) };
}

// Fixture: real AO3 page dump of works/80642696 ("A Villain By Any Other Name..." by Silvia_Goddess_of_Being_Right)
// 5-chapter completed work; Chapter 2 has pre-chapter author notes; all chapters have end notes.
describe("AO3 parser — multi-chapter work (works/80642696)", () => {
  beforeEach(() => {
    const tab = { id: 1, discarded: false };
    vi.spyOn(browser.tabs, "query").mockResolvedValue([tab] as never);
    vi.spyOn(browser.tabs, "sendMessage").mockImplementation(async (_tabId, msg) => {
      const { url } = msg as { url: string };
      if (url.includes("archiveofourown.org/works/80642696"))
        return proxyResponse("ao3-multichapter.html");
      throw new Error(`Unexpected proxy fetch: ${url}`);
    });
  });

  it("extracts title and author", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/80642696",
      DEFAULT_SETTINGS,
    );
    expect(data.core.title).toBe("A Villain By Any Other Name...");
    expect(data.core.author).toBe("Silvia_Goddess_of_Being_Right");
  });

  it("extracts all 5 chapters", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/80642696",
      DEFAULT_SETTINGS,
    );
    expect(data.core.chapters).toHaveLength(5);
  });

  it("extracts chapter titles", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/80642696",
      DEFAULT_SETTINGS,
    );
    expect(data.core.chapters[0]!.title).toBe("Clockblocker");
    expect(data.core.chapters[1]!.title).toBe("Kid Win");
  });

  it("extracts chapter body content", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/80642696",
      DEFAULT_SETTINGS,
    );
    expect(data.core.chapters[0]!.htmlContent).toContain("Dennis is tired.");
    expect(data.core.chapters[1]!.htmlContent).toContain("Armsmaster got kicked out");
  });

  it("excludes author notes by default", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/80642696",
      DEFAULT_SETTINGS,
    );
    expect(data.core.chapters[0]!.htmlContent).not.toContain("Wrote this fic after rereading");
    expect(data.core.chapters[1]!.htmlContent).not.toContain("Another round of thanks to HQM");
  });

  it("includes author notes when the setting is enabled", async () => {
    const settings = { ...DEFAULT_SETTINGS, includeAuthorNotes: true };
    const data = await ao3Parser.parse("https://archiveofourown.org/works/80642696", settings);
    expect(data.core.chapters[0]!.htmlContent).toContain("Wrote this fic after rereading");
    expect(data.core.chapters[1]!.htmlContent).toContain("Another round of thanks to HQM");
  });

  it("extracts publish and update dates", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/80642696",
      DEFAULT_SETTINGS,
    );
    expect(data.core.publishDate).toBeInstanceOf(Date);
    expect(data.core.updateDate).toBeInstanceOf(Date);
    expect(data.core.publishDate!.getFullYear()).toBe(2026);
    expect(data.core.updateDate!.getFullYear()).toBe(2026);
  });

  it("detects status as complete for a completed work", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/80642696",
      DEFAULT_SETTINGS,
    );
    expect(data.core.status).toBe("complete");
  });

  it("throws a clear error when no AO3 tab is open", async () => {
    vi.spyOn(browser.tabs, "query").mockResolvedValue([] as never);
    await expect(
      ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS),
    ).rejects.toThrow(/No .+ tab open/);
  });

  it("throws a clear error when Cloudflare blocks the tab response", async () => {
    vi.spyOn(browser.tabs, "sendMessage").mockResolvedValue({
      ok: false,
      status: 403,
      text: "<html><script>window._cf_chl_opt = {}</script></html>",
    } as never);
    await expect(
      ao3Parser.parse("https://archiveofourown.org/works/80642696", DEFAULT_SETTINGS),
    ).rejects.toThrow(/Cloudflare/);
  });
});

describe("AO3 parser — works/75693471 (The Things We Miss)", () => {
  beforeEach(() => {
    const tab = { id: 1, discarded: false };
    vi.spyOn(browser.tabs, "query").mockResolvedValue([tab] as never);
    vi.spyOn(browser.tabs, "sendMessage").mockImplementation(async (_tabId, msg) => {
      const { url } = msg as { url: string };
      if (url.includes("archiveofourown.org/works/75693471")) return proxyResponse("ao3-work.html");
      throw new Error(`Unexpected proxy fetch: ${url}`);
    });
  });

  it("returns the correct site identifier", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/75693471",
      DEFAULT_SETTINGS,
    );
    expect(data.site).toBe("ao3");
  });

  it("extracts title and author", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/75693471",
      DEFAULT_SETTINGS,
    );
    expect(data.core.title).toBe("The Things We Miss");
    expect(data.core.author).toBe("Serenacula");
  });

  it("extracts summary", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/75693471",
      DEFAULT_SETTINGS,
    );
    expect(data.core.summary).toContain("Praem is not quite as mature");
  });

  it("extracts chapter content", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/75693471",
      DEFAULT_SETTINGS,
    );
    expect(data.core.chapters).toHaveLength(1);
    expect(data.core.chapters[0]!.htmlContent).toContain("It was quite late");
  });

  it("extracts AO3-specific metadata", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/75693471",
      DEFAULT_SETTINGS,
    );
    const meta = data.meta as AO3Metadata;
    expect(meta.fandoms).toContain("Katalepsis - Hungry");
    expect(meta.rating).toBe("General Audiences");
  });

  it("extracts dates", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/75693471",
      DEFAULT_SETTINGS,
    );
    expect(data.core.publishDate).toBeInstanceOf(Date);
  });

  it("extracts word count", async () => {
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/75693471",
      DEFAULT_SETTINGS,
    );
    expect(data.core.wordCount).toBeGreaterThan(0);
  });
});

describe("AO3 parser — in-progress status detection", () => {
  it("detects status as in-progress when the status label is 'Updated:'", async () => {
    const tab = { id: 1, discarded: false };
    vi.spyOn(browser.tabs, "query").mockResolvedValue([tab] as never);
    const stubHtml = `<!DOCTYPE html><html><body>
      <h2 class="title heading">In Progress Work</h2>
      <h3 class="byline heading"><a>Author Name</a></h3>
      <dl class="stats">
        <dt class="status">Updated:</dt>
        <dd class="status">2026-01-01</dd>
        <dt class="published">Published:</dt>
        <dd class="published">2025-01-01</dd>
        <dt class="words">Words:</dt><dd class="words">1,000</dd>
      </dl>
      <div id="chapters">
        <div class="chapter">
          <div class="userstuff module"><p>Some content.</p></div>
        </div>
      </div>
    </body></html>`;
    vi.spyOn(browser.tabs, "sendMessage").mockResolvedValue({
      ok: true,
      status: 200,
      text: stubHtml,
    } as never);
    const data = await ao3Parser.parse(
      "https://archiveofourown.org/works/99999998",
      DEFAULT_SETTINGS,
    );
    expect(data.core.status).toBe("in-progress");
  });
});

describe("AO3 parser — empty chapter content guard", () => {
  it("throws a clear error when no chapter content is found in the document", async () => {
    const tab = { id: 1, discarded: false };
    vi.spyOn(browser.tabs, "query").mockResolvedValue([tab] as never);
    // Return a stub document that has no .userstuff or #chapters > .chapter elements
    const stubHtml = `<!DOCTYPE html><html><body>
      <h2 class="title heading">Empty Work</h2>
      <h3 class="byline heading"><a>Author Name</a></h3>
      <div id="chapters"></div>
    </body></html>`;
    vi.spyOn(browser.tabs, "sendMessage").mockResolvedValue({
      ok: true,
      status: 200,
      text: stubHtml,
    } as never);
    await expect(
      ao3Parser.parse("https://archiveofourown.org/works/99999999", DEFAULT_SETTINGS),
    ).rejects.toThrow(/No chapter content found in AO3 work/);
  });
});
