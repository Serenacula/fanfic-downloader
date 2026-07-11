import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../parsers/index.js", () => ({
  isFicPage: vi.fn(() => true),
}));

vi.mock("../../popup/messaging.js", () => ({
  send: vi.fn(async () => ({ type: "jobs", jobs: [] })),
}));

vi.mock("../../shared/settings.js", () => ({
  getSettings: vi.fn(),
}));

const { getSettings } = await import("../../shared/settings.js");
const { renderDownloadList } = await import("../../popup/screens/download-list.js");

describe("popup download list — download button", () => {
  let cleanup: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    const browserBase = (globalThis as Record<string, unknown>).browser as Record<string, unknown>;
    (globalThis as Record<string, unknown>).browser = {
      ...browserBase,
      tabs: {
        ...(browserBase.tabs as Record<string, unknown>),
        query: vi.fn(async () => [{ id: 1, url: "https://archiveofourown.org/works/1" }]),
      },
      action: { setBadgeText: vi.fn(async () => {}) },
      runtime: { getURL: vi.fn((path: string) => path) },
    };
  });

  afterEach(() => {
    cleanup?.();
  });

  it("logs the error instead of dropping it when getSettings rejects", async () => {
    vi.mocked(getSettings).mockRejectedValue(new Error("storage unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const container = document.createElement("div");
    cleanup = await renderDownloadList(container, () => {});

    const downloadButton = container.querySelector("#btn-download") as HTMLButtonElement;
    downloadButton.dispatchEvent(new Event("click", { bubbles: true }));

    await vi.waitFor(() => {
      if (errorSpy.mock.calls.length === 0) throw new Error("error not logged yet");
    });

    expect(errorSpy).toHaveBeenCalledWith(
      "[fanfic-downloader] failed to start download:",
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});
