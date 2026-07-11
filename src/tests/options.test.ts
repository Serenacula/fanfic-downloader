import { describe, it, expect, vi, beforeEach } from "vitest";

const baseSettings = {
  version: 1 as const,
  format: "epub" as const,
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
};

vi.mock("../shared/settings.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../shared/settings.js")>();
  return {
    ...actual,
    getSettings: vi.fn(async () => baseSettings),
    saveSettings: vi.fn(),
  };
});

const { saveSettings } = await import("../shared/settings.js");

describe("options page — reset to defaults button", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '<div id="app"></div>';
    vi.mocked(saveSettings).mockReset();
  });

  it("logs the error instead of dropping it when saveSettings rejects", async () => {
    vi.mocked(saveSettings).mockRejectedValue(new Error("storage quota exceeded"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../options/index.js");

    const resetButton = await vi.waitFor(() => {
      const button = document.getElementById("btn-reset");
      if (!button) throw new Error("button not rendered yet");
      return button;
    });

    resetButton.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() => {
      if (errorSpy.mock.calls.length === 0) throw new Error("error not logged yet");
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[fanfic-downloader] failed to reset settings:",
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});
