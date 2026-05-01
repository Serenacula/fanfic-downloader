import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FicData } from "../../shared/types.js";

vi.mock("../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { enqueue } = await import("../background/request-queue.js");
const { formatFilename, fetchCoverImage } = await import("../renderers/utils.js");

function makeFicData(
  title: string,
  author: string,
  publishDate: Date | null = null,
  updateDate: Date | null = null,
): FicData {
  return {
    site: "ao3",
    core: {
      title,
      author,
      summary: null,
      chapters: [],
      images: [],
      tags: [],
      status: "unknown",
      wordCount: null,
      publishDate,
      updateDate,
      coverImageUrl: null,
      sourceUrl: "https://example.com",
    },
    meta: {
      fandoms: [],
      relationships: [],
      characters: [],
      additionalTags: [],
      warnings: [],
      rating: null,
      kudos: null,
      bookmarks: null,
      hits: null,
      language: null,
      series: [],
    },
  };
}

describe("formatFilename", () => {
  it("substitutes {title} and {author}", () => {
    expect(formatFilename("{title} - {author}", makeFicData("My Story", "Jane Doe")))
      .toBe("My Story - Jane Doe");
  });

  it("prevents a title containing {author} from expanding into the author value", () => {
    const result = formatFilename("{title} by {author}", makeFicData("{author}", "Real Author"));
    expect(result).not.toContain("Real Author Real Author");
    expect(result).toBe("_ by Real Author");
  });

  it("prevents an author containing {title} from expanding into the title value", () => {
    const result = formatFilename("{title} by {author}", makeFicData("Real Title", "{title}"));
    expect(result).not.toContain("Real Title Real Title");
    expect(result).toBe("Real Title by _");
  });

  it("prevents chained template injection across multiple fields", () => {
    const result = formatFilename("{title}", makeFicData("{currentDate}", "A"));
    expect(result).toBe("_");
  });

  it("replaces filesystem-unsafe characters with underscores", () => {
    const result = formatFilename("{title}", makeFicData('Story: "Part/One" <two>', "A"));
    expect(result).not.toMatch(/[<>:"/\\|?*]/);
    expect(result).toContain("Story");
  });

  it("formats {currentDate} as YYYY-MM-DD", () => {
    expect(formatFilename("{currentDate}", makeFicData("T", "A"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("formats {publishDate} correctly when present", () => {
    const data = makeFicData("T", "A", new Date("2024-03-15T00:00:00Z"));
    expect(formatFilename("{publishDate}", data)).toBe("2024-03-15");
  });

  it("formats {updateDate} correctly when present", () => {
    const data = makeFicData("T", "A", null, new Date("2024-06-01T00:00:00Z"));
    expect(formatFilename("{updateDate}", data)).toBe("2024-06-01");
  });

  it("produces empty string for {publishDate} when null", () => {
    expect(formatFilename("{publishDate}", makeFicData("T", "A", null))).toBe("");
  });

  it("trims leading and trailing whitespace from the result", () => {
    expect(formatFilename("  {title}  ", makeFicData("Story", "Author"))).toBe("Story");
  });

  it("leaves a template with no recognised variables unchanged", () => {
    expect(formatFilename("static-name", makeFicData("T", "A"))).toBe("static-name");
  });
});

describe("fetchCoverImage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for a null URL without calling enqueue", async () => {
    expect(await fetchCoverImage(null)).toBeNull();
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("returns null when the response status is not ok", async () => {
    vi.mocked(enqueue).mockResolvedValue(new Response("", { status: 404 }));
    expect(await fetchCoverImage("https://example.com/cover.jpg")).toBeNull();
  });

  it("returns null when enqueue throws", async () => {
    vi.mocked(enqueue).mockRejectedValue(new Error("Network error"));
    expect(await fetchCoverImage("https://example.com/cover.jpg")).toBeNull();
  });

  it("routes the request through enqueue rather than raw fetch", async () => {
    vi.mocked(enqueue).mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );
    await fetchCoverImage("https://example.com/cover.jpg");
    expect(enqueue).toHaveBeenCalledWith("https://example.com/cover.jpg");
  });

  it("extracts jpg for image/jpeg", async () => {
    vi.mocked(enqueue).mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/jpeg" } }),
    );
    expect((await fetchCoverImage("https://example.com/cover.jpg"))?.extension).toBe("jpg");
  });

  it("extracts png for image/png", async () => {
    vi.mocked(enqueue).mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/png" } }),
    );
    expect((await fetchCoverImage("https://example.com/cover.png"))?.extension).toBe("png");
  });

  it("strips +xml suffix from image/svg+xml", async () => {
    vi.mocked(enqueue).mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200, headers: { "content-type": "image/svg+xml" } }),
    );
    expect((await fetchCoverImage("https://example.com/cover.svg"))?.extension).toBe("svg");
  });

  it("defaults to jpg when content-type header is absent", async () => {
    vi.mocked(enqueue).mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200 }),
    );
    expect((await fetchCoverImage("https://example.com/cover"))?.extension).toBe("jpg");
  });

  it("returns the raw image bytes", async () => {
    const bytes = new Uint8Array([10, 20, 30]);
    vi.mocked(enqueue).mockResolvedValue(
      new Response(bytes, { status: 200, headers: { "content-type": "image/png" } }),
    );
    const result = await fetchCoverImage("https://example.com/cover.png");
    expect(result?.data).toBeInstanceOf(Uint8Array);
    expect(result?.data.length).toBe(3);
  });
});
