import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSettings } from "../../shared/settings.js";
import { createQueue } from "../request-queue.js";

vi.mock("../../shared/settings.js");

const mockedGetSettings = vi.mocked(getSettings);

function makeResponse(ok: boolean, status = ok ? 200 : 500): Response {
  return { ok, status, url: "" } as unknown as Response;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  mockedGetSettings.mockResolvedValue({
    version: 1,
    format: "epub",
    includeImages: true,
    includeCoverImage: true,
    includeCoverPage: true,
    includeToc: true,
    includeAuthorNotes: false,
    chapterSplit: false,
    includeChapterTitles: true,
    confirmationDialogue: false,
    rateLimitMs: 0,
    filenameTemplate: "{title} - {author}",
    storyInfoFields: {},
  });
});

describe("request queue", () => {
  it("resolves with the response on success", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(true));
    vi.stubGlobal("fetch", mockFetch);
    const queue = createQueue();

    const promise = queue.enqueue("https://example.com/1");
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("retries a failing request up to 3 times then rejects", async () => {
    const mockFetch = vi.fn().mockResolvedValue(makeResponse(false, 500));
    vi.stubGlobal("fetch", mockFetch);
    const queue = createQueue();

    const promise = queue.enqueue("https://example.com/retry");
    const assertion = expect(promise).rejects.toThrow("Request failed after 3 retries");
    for (let i = 0; i < 10; i++) {
      await vi.runAllTimersAsync();
    }
    await assertion;
    expect(mockFetch).toHaveBeenCalledTimes(4); // initial + 3 retries
  });

  it("caps concurrent in-flight requests at 3", async () => {
    let inFlightPeak = 0;
    let currentlyInFlight = 0;

    const mockFetch = vi.fn().mockImplementation(async () => {
      currentlyInFlight++;
      inFlightPeak = Math.max(inFlightPeak, currentlyInFlight);
      await Promise.resolve();
      currentlyInFlight--;
      return makeResponse(true);
    });
    vi.stubGlobal("fetch", mockFetch);
    const queue = createQueue();

    const promises = Array.from({ length: 10 }, (_, index) =>
      queue.enqueue(`https://example.com/${index}`),
    );
    await vi.runAllTimersAsync();
    await Promise.allSettled(promises);

    expect(inFlightPeak).toBeLessThanOrEqual(3);
  });

  it("respects the minimum delay between request starts", async () => {
    mockedGetSettings.mockResolvedValue({
      version: 1,
      format: "epub",
      includeImages: true,
      includeCoverImage: true,
      includeCoverPage: true,
      includeToc: true,
      includeAuthorNotes: false,
      chapterSplit: false,
      includeChapterTitles: true,
      confirmationDialogue: false,
      rateLimitMs: 500,
      filenameTemplate: "{title} - {author}",
      storyInfoFields: {},
    });

    const dispatchTimes: number[] = [];
    const mockFetch = vi.fn().mockImplementation(() => {
      dispatchTimes.push(Date.now());
      return Promise.resolve(makeResponse(true));
    });
    vi.stubGlobal("fetch", mockFetch);
    const queue = createQueue();

    const promises = [
      queue.enqueue("https://example.com/a"),
      queue.enqueue("https://example.com/b"),
    ];
    await vi.runAllTimersAsync();
    await Promise.allSettled(promises);

    expect(dispatchTimes).toHaveLength(2);
    const gap = (dispatchTimes[1] ?? 0) - (dispatchTimes[0] ?? 0);
    expect(gap).toBeGreaterThanOrEqual(500);
  });
});
