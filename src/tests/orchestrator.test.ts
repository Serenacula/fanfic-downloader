import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FicData } from "../shared/types.js";
import type { DataOverrides } from "../background/orchestrator.js";

vi.mock("../parsers/index.js", () => ({
  detectParser: vi.fn(),
  isFicPage: vi.fn(),
}));

vi.mock("../renderers/epub.js", () => ({ renderEpub: vi.fn() }));
vi.mock("../renderers/html.js", () => ({ renderHtml: vi.fn() }));
vi.mock("../renderers/markdown.js", () => ({ renderMarkdown: vi.fn() }));
vi.mock("../renderers/txt.js", () => ({ renderTxt: vi.fn() }));
vi.mock("../renderers/pdf.js", () => ({ renderPdf: vi.fn() }));
vi.mock("../renderers/docx.js", () => ({ renderDocx: vi.fn() }));
vi.mock("../renderers/utils.js", () => ({
  formatFilename: vi.fn(() => "test-story"),
  fetchCoverImage: vi.fn(async () => null),
  htmlToText: vi.fn(() => ""),
  htmlToMarkdown: vi.fn(() => ""),
  zipFiles: vi.fn(async () => new Blob()),
}));

const { detectParser } = await import("../parsers/index.js");
const { renderTxt } = await import("../renderers/txt.js");
const { getJobs, startDownload, retryJob } = await import("../background/orchestrator.js");

const FAKE_FIC: FicData = {
  site: "ffn",
  core: {
    title: "Test Story",
    author: "Test Author",
    summary: null,
    chapters: [{ index: 0, title: "Chapter 1", htmlContent: "<p>content</p>" }],
    images: [],
    tags: [],
    status: "complete",
    wordCount: 100,
    publishDate: null,
    updateDate: null,
    coverImageUrl: null,
    sourceUrl: "https://www.fanfiction.net/s/1/",
  },
  meta: { genres: [], universe: null, follows: null, favs: null, rating: null, language: null },
};

let sessionStore: Record<string, unknown> = {};

beforeEach(() => {
  sessionStore = {};
  vi.clearAllMocks();

  const browserBase = (globalThis as Record<string, unknown>).browser as Record<string, unknown>;
  (globalThis as Record<string, unknown>).browser = {
    ...browserBase,
    storage: {
      ...(browserBase.storage as Record<string, unknown>),
      session: {
        get: vi.fn(async (key: string) => ({ [key]: sessionStore[key] })),
        set: vi.fn(async (obj: Record<string, unknown>) => { Object.assign(sessionStore, obj); }),
      },
    },
    downloads: { download: vi.fn(async () => 1) },
    action: {
      setBadgeText: vi.fn(async () => {}),
      setBadgeBackgroundColor: vi.fn(async () => {}),
    },
    tabs: { query: vi.fn(async () => []) },
    scripting: { executeScript: vi.fn(async () => {}) },
  };
});

describe("getJobs — session storage type guard", () => {
  it("returns an empty array when storage contains a non-object value", async () => {
    sessionStore["downloadJobs"] = "corrupted";
    expect(await getJobs()).toEqual([]);
  });

  it("returns an empty array when storage entries lack the required id/status fields", async () => {
    sessionStore["downloadJobs"] = { xyz: { badField: true } };
    expect(await getJobs()).toEqual([]);
  });

  it("returns an empty array when storage is empty", async () => {
    expect(await getJobs()).toEqual([]);
  });
});

describe("startDownload — job persistence", () => {
  it("stores the job immediately before runDownload fires", async () => {
    vi.mocked(detectParser).mockReturnValue({ parse: vi.fn(() => Promise.resolve(FAKE_FIC)), pattern: /ffn/ });
    vi.mocked(renderTxt).mockResolvedValue(new Blob(["text"], { type: "text/plain" }));

    const id = await startDownload("https://www.fanfiction.net/s/1/1/");
    const jobs = await getJobs();
    expect(jobs.some((job) => job.id === id)).toBe(true);
  });

  it("stores overrides in the job record", async () => {
    vi.mocked(detectParser).mockReturnValue({ parse: vi.fn().mockRejectedValue(new Error("fail")), pattern: /ffn/ });

    const overrides = { format: "txt" as const };
    const dataOverrides: DataOverrides = { title: "Custom Title" };
    const id = await startDownload("https://www.fanfiction.net/s/1/1/", overrides, dataOverrides);

    const jobs = await getJobs();
    const job = jobs.find((j) => j.id === id);
    expect(job?.overrides).toMatchObject(overrides);
    expect(job?.dataOverrides).toMatchObject(dataOverrides);
  });

  it("stores a job with undefined overrides when none are passed", async () => {
    vi.mocked(detectParser).mockReturnValue({ parse: vi.fn().mockRejectedValue(new Error("fail")), pattern: /ffn/ });

    const id = await startDownload("https://www.fanfiction.net/s/1/1/");
    const jobs = await getJobs();
    const job = jobs.find((j) => j.id === id);
    expect(job?.overrides).toBeUndefined();
    expect(job?.dataOverrides).toBeUndefined();
  });
});

describe("retryJob — overrides pass-through", () => {
  it("calls the parser a second time and preserves overrides after retry", async () => {
    const mockParse = vi.fn().mockRejectedValue(new Error("parse failed"));
    vi.mocked(detectParser).mockReturnValue({ parse: mockParse, pattern: /ffn/ });

    const overrides = { format: "txt" as const };
    const id = await startDownload("https://www.fanfiction.net/s/1/1/", overrides);

    // Wait for first attempt to fail
    await vi.waitFor(async () => {
      const jobs = await getJobs();
      return jobs.find((j) => j.id === id && j.status === "failed") != null;
    }, { timeout: 2000 });

    await retryJob(id);

    // Wait for the retry to also fail — this confirms runDownload ran again
    await vi.waitFor(async () => {
      const jobs = await getJobs();
      const job = jobs.find((j) => j.id === id);
      return job?.status === "failed" && mockParse.mock.calls.length >= 2;
    }, { timeout: 2000 });

    expect(mockParse.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Overrides must survive the retry round-trip through session storage
    const jobs = await getJobs();
    expect(jobs.find((j) => j.id === id)?.overrides).toMatchObject(overrides);
  });

  it("does nothing for an unknown job id", async () => {
    await expect(retryJob("nonexistent-id")).resolves.toBeUndefined();
  });
});
