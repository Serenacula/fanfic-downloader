import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../shared/settings.js", () => ({
  getSettings: vi.fn(async () => ({
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
    maxConcurrentDownloads: 3,
    filenameTemplate: "{title} - {author}",
    storyInfoFields: {},
    debugLogging: false,
  })),
}));

describe("confirmation dialog — download button", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';

    const browserBase = (globalThis as Record<string, unknown>).browser as Record<string, unknown>;
    (globalThis as Record<string, unknown>).browser = {
      ...browserBase,
      runtime: { sendMessage: vi.fn() },
      tabs: {
        ...(browserBase.tabs as Record<string, unknown>),
        getCurrent: vi.fn(async () => ({ id: 1 })),
        remove: vi.fn(),
      },
    };
  });

  it("keeps the dialog open and logs the error instead of dropping it when sendMessage rejects", async () => {
    const browserRef = (globalThis as Record<string, unknown>).browser as {
      runtime: { sendMessage: ReturnType<typeof vi.fn> };
    };
    browserRef.runtime.sendMessage.mockRejectedValue(new Error("background not responding"));

    const closeSpy = vi.spyOn(window, "close").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../confirmation/index.js");

    const downloadButton = await vi.waitFor(() => {
      const button = document.getElementById("btn-download");
      if (!button) throw new Error("button not rendered yet");
      return button;
    });

    downloadButton.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() => {
      if (errorSpy.mock.calls.length === 0) throw new Error("error not logged yet");
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[fanfic-downloader] failed to start download:",
      expect.any(Error),
    );
    expect(closeSpy).not.toHaveBeenCalled();

    closeSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
