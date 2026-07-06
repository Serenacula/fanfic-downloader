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
const { renderEpub } = await import("../renderers/epub.js");
const {
  getJobs,
  startDownload,
  retryJob,
  cancelJob,
  handleDownloadChange,
  resetOrchestratorStateForTests,
} = await import("../background/orchestrator.js");

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
  // The orchestrator caches jobs and tracks cancellation in module state;
  // without this reset, tests read the previous test's cache instead of storage.
  resetOrchestratorStateForTests();

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

describe("startDownload — object URL lifecycle", () => {
  it("revokes the object URL even when browser.downloads.download rejects", async () => {
    vi.mocked(detectParser).mockReturnValue({ parse: vi.fn(() => Promise.resolve(FAKE_FIC)), pattern: /ffn/ });
    vi.mocked(renderEpub).mockResolvedValue(new Blob(["epub"], { type: "application/epub+zip" }));

    const revokespy = vi.spyOn(URL, "revokeObjectURL");

    const browserRef = (globalThis as Record<string, unknown>).browser as {
      downloads: { download: ReturnType<typeof vi.fn> };
      [key: string]: unknown;
    };
    browserRef.downloads.download.mockRejectedValueOnce(new Error("download failed"));

    const id = await startDownload("https://www.fanfiction.net/s/1/1/");

    await vi.waitFor(async () => {
      const jobs = await getJobs();
      const job = jobs.find((j) => j.id === id);
      if (job?.status !== "failed") throw new Error("Job has not failed yet");
    }, { timeout: 2000 });

    expect(revokespy).toHaveBeenCalled();
    revokespy.mockRestore();
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
      const failed = jobs.find((j) => j.id === id && j.status === "failed") != null;
      if (!failed) throw new Error("Job has not failed yet");
    }, { timeout: 2000 });

    await retryJob(id);

    // Wait for the retry to also fail — this confirms runDownload ran again
    await vi.waitFor(async () => {
      const jobs = await getJobs();
      const job = jobs.find((j) => j.id === id);
      const ready = job?.status === "failed" && mockParse.mock.calls.length >= 2;
      if (!ready) throw new Error("Retry has not completed yet");
    }, { timeout: 2000 });

    expect(mockParse.mock.calls.length).toBeGreaterThanOrEqual(2);

    // Overrides must survive the retry round-trip through session storage
    const jobs = await getJobs();
    expect(jobs.find((j) => j.id === id)?.overrides).toMatchObject(overrides);
  });

  it("does nothing for an unknown job id", async () => {
    await expect(retryJob("nonexistent-id")).resolves.toBeUndefined();
  });

  it("does not restart a job that is still running", async () => {
    // Parser never resolves, so the job stays in a fetching state
    const mockParse = vi.fn(() => new Promise<FicData>(() => {}));
    vi.mocked(detectParser).mockReturnValue({ parse: mockParse, pattern: /ffn/ });

    const id = await startDownload("https://www.fanfiction.net/s/1/1/");
    await vi.waitFor(async () => {
      const job = (await getJobs()).find((j) => j.id === id);
      if (job?.status !== "fetching-metadata") throw new Error("Job has not started yet");
    }, { timeout: 2000 });

    await retryJob(id);
    expect(mockParse).toHaveBeenCalledTimes(1);
  });
});

describe("cancelJob then retryJob — stale run does not race the retry", () => {
  it("ignores the cancelled run when its parse resolves after a retry started", async () => {
    let resolveFirstParse: ((data: FicData) => void) | undefined;
    const mockParse = vi.fn()
      .mockImplementationOnce(() => new Promise<FicData>((resolve) => { resolveFirstParse = resolve; }))
      .mockImplementation(() => new Promise<FicData>(() => {}));
    vi.mocked(detectParser).mockReturnValue({ parse: mockParse, pattern: /ffn/ });
    vi.mocked(renderTxt).mockResolvedValue(new Blob(["text"], { type: "text/plain" }));

    const id = await startDownload("https://www.fanfiction.net/s/1/1/", { format: "txt" });
    await vi.waitFor(() => {
      if (mockParse.mock.calls.length < 1) throw new Error("Parse not called yet");
    }, { timeout: 2000 });

    await cancelJob(id);
    await retryJob(id);
    await vi.waitFor(() => {
      if (mockParse.mock.calls.length < 2) throw new Error("Retry parse not called yet");
    }, { timeout: 2000 });

    // The first (cancelled) run's parse finally resolves — it must notice it is
    // stale and stop, not continue on to render and clobber the retried job.
    resolveFirstParse!(FAKE_FIC);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(renderTxt).not.toHaveBeenCalled();
    const job = (await getJobs()).find((j) => j.id === id);
    expect(job?.status).toBe("fetching-metadata");
  });
});

describe("handleDownloadChange — object URL lifecycle", () => {
  it("revokes the object URL when the browser reports the download complete", async () => {
    vi.mocked(detectParser).mockReturnValue({ parse: vi.fn(() => Promise.resolve(FAKE_FIC)), pattern: /ffn/ });
    vi.mocked(renderTxt).mockResolvedValue(new Blob(["text"], { type: "text/plain" }));

    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");

    const id = await startDownload("https://www.fanfiction.net/s/1/1/", { format: "txt" });
    await vi.waitFor(async () => {
      const job = (await getJobs()).find((j) => j.id === id);
      if (job?.status !== "complete") throw new Error("Job has not completed yet");
    }, { timeout: 2000 });

    expect(revokeSpy).not.toHaveBeenCalled();
    handleDownloadChange({ id: 1, state: { current: "complete" } });
    expect(revokeSpy).toHaveBeenCalledTimes(1);

    // A second event for the same download must not double-revoke
    handleDownloadChange({ id: 1, state: { current: "complete" } });
    expect(revokeSpy).toHaveBeenCalledTimes(1);
    revokeSpy.mockRestore();
  });
});
