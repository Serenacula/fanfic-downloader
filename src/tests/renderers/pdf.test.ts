import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("pdfmake/build/pdfmake.js", () => ({
  default: {
    virtualfs: { writeFileSync: vi.fn() },
  },
}));

const { ensureFontsLoaded, htmlToPdfContent } = await import("../../renderers/pdf.js");

describe("ensureFontsLoaded — failure recovery", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    (globalThis as Record<string, unknown>).browser = {
      ...((globalThis as Record<string, unknown>).browser as Record<string, unknown>),
      runtime: { getURL: (path: string) => `moz-extension://test/${path}` },
    };
  });

  it("retries the font fetch after a failed load instead of caching the rejection", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", mockFetch);

    await expect(ensureFontsLoaded()).rejects.toThrow("network down");
    const callsAfterFirstAttempt = mockFetch.mock.calls.length;

    await expect(ensureFontsLoaded()).rejects.toThrow("network down");
    expect(mockFetch.mock.calls.length).toBeGreaterThan(callsAfterFirstAttempt);
  });

  it("caches a successful load and does not refetch fonts", async () => {
    const mockFetch = vi
      .fn()
      .mockImplementation(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
    vi.stubGlobal("fetch", mockFetch);

    await ensureFontsLoaded();
    const callsAfterFirstLoad = mockFetch.mock.calls.length;
    expect(callsAfterFirstLoad).toBe(4); // four font files

    await ensureFontsLoaded();
    expect(mockFetch.mock.calls.length).toBe(callsAfterFirstLoad);
  });
});

describe("htmlToPdfContent — inline formatting", () => {
  it("splits a paragraph into runs preserving bold and italic", () => {
    const parts = htmlToPdfContent("<p>plain <strong>bold</strong> and <em>italic</em></p>");
    expect(parts).toEqual([
      {
        text: [
          { text: "plain " },
          { text: "bold", bold: true },
          { text: " and " },
          { text: "italic", italics: true },
        ],
        margin: [0, 4, 0, 4],
      },
    ]);
  });

  it("combines nested bold and italic into a single run", () => {
    const parts = htmlToPdfContent("<p><strong><em>both</em></strong></p>");
    expect(parts).toEqual([
      { text: [{ text: "both", bold: true, italics: true }], margin: [0, 4, 0, 4] },
    ]);
  });

  it("treats b and i tags the same as strong and em", () => {
    const parts = htmlToPdfContent("<p><b>bold</b><i>italic</i></p>");
    expect(parts).toEqual([
      {
        text: [
          { text: "bold", bold: true },
          { text: "italic", italics: true },
        ],
        margin: [0, 4, 0, 4],
      },
    ]);
  });

  it("keeps formatting inside list items", () => {
    const parts = htmlToPdfContent("<ul><li>one <strong>bold</strong></li><li>two</li></ul>");
    expect(parts).toEqual([
      {
        ul: [[{ text: "one " }, { text: "bold", bold: true }], [{ text: "two" }]],
        margin: [0, 4, 0, 4],
      },
    ]);
  });

  it("renders blockquote content as italic runs", () => {
    const parts = htmlToPdfContent("<blockquote>quoted</blockquote>");
    expect(parts).toEqual([
      {
        text: [{ text: "quoted", italics: true }],
        margin: [20, 4, 0, 4],
        italics: true,
        color: "#555555",
      },
    ]);
  });

  it("drops paragraphs with no content", () => {
    expect(htmlToPdfContent("<p></p>")).toEqual([]);
  });
});
