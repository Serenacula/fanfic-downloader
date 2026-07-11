import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../shared/settings.js", () => ({
  getSettings: vi.fn(),
}));

const { getSettings } = await import("../shared/settings.js");
const { initLogger, debugLog } = await import("../shared/logger.js");

type ChangeListener = (changes: Record<string, unknown>, areaName: string) => void;

function stubOnChanged(): { addListener: ReturnType<typeof vi.fn> } {
  const addListener = vi.fn();
  const browserBase = (globalThis as Record<string, unknown>).browser as Record<string, unknown>;
  (globalThis as Record<string, unknown>).browser = {
    ...browserBase,
    storage: {
      ...(browserBase.storage as Record<string, unknown>),
      onChanged: { addListener },
    },
  };
  return { addListener };
}

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not log before initLogger has run", () => {
    stubOnChanged();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    debugLog("should be silent");
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it("starts logging once storage.onChanged reports debugLogging enabled", async () => {
    const { addListener } = stubOnChanged();
    vi.mocked(getSettings).mockResolvedValue({
      debugLogging: false,
    } as Awaited<ReturnType<typeof getSettings>>);

    initLogger();
    await vi.waitFor(() => {
      if (addListener.mock.calls.length === 0) throw new Error("listener not registered yet");
    });

    const logSpyBefore = vi.spyOn(console, "log").mockImplementation(() => {});
    debugLog("still disabled");
    expect(logSpyBefore).not.toHaveBeenCalled();
    logSpyBefore.mockRestore();

    vi.mocked(getSettings).mockResolvedValue({
      debugLogging: true,
    } as Awaited<ReturnType<typeof getSettings>>);
    const listener = addListener.mock.calls[0]?.[0] as ChangeListener;
    listener({ settings: {} }, "local");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    await vi.waitFor(() => {
      debugLog("now enabled");
      if (logSpy.mock.calls.length === 0) throw new Error("not enabled yet");
    });
    expect(logSpy).toHaveBeenCalledWith("[fanfic-downloader]", "now enabled");
    logSpy.mockRestore();
  });

  it("ignores onChanged events outside the local settings key", async () => {
    const { addListener } = stubOnChanged();
    vi.mocked(getSettings).mockResolvedValue({
      debugLogging: false,
    } as Awaited<ReturnType<typeof getSettings>>);

    initLogger();
    await vi.waitFor(() => {
      if (addListener.mock.calls.length === 0) throw new Error("listener not registered yet");
    });
    const callsBefore = vi.mocked(getSettings).mock.calls.length;

    const listener = addListener.mock.calls[0]?.[0] as ChangeListener;
    listener({ downloadJobs: {} }, "session");
    listener({}, "local");

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(vi.mocked(getSettings).mock.calls.length).toBe(callsBefore);
  });
});
