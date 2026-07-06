// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { unzipSync } from "fflate";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { FicData } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
    enqueue: vi.fn(),
    requestQueue: { enqueue: vi.fn() },
    createQueue: vi.fn(),
}));

vi.mock("../../renderers/utils.js", async (importOriginal) => {
    const original = await importOriginal<typeof import("../../renderers/utils.js")>();
    return { ...original, fetchCoverImage: vi.fn() };
});

const { renderEpub } = await import("../../renderers/epub.js");
const { fetchCoverImage } = await import("../../renderers/utils.js");

function makeFicData(): FicData {
    return {
        site: "ao3",
        core: {
            title: "Test Story",
            author: "Test Author",
            summary: null,
            chapters: [
                { index: 0, title: "Chapter One", htmlContent: "<p>Content</p>" },
                { index: 1, title: "Chapter Two", htmlContent: "<p>More content</p>" },
            ],
            images: [],
            tags: [],
            status: "unknown",
            wordCount: null,
            publishDate: null,
            updateDate: null,
            coverImageUrl: null,
            sourceUrl: "https://archiveofourown.org/works/1",
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

async function unzipEpub(blob: Blob): Promise<Record<string, string>> {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const raw = unzipSync(bytes);
    const result: Record<string, string> = {};
    const decoder = new TextDecoder("utf-8");
    for (const [path, data] of Object.entries(raw)) {
        result[path] = decoder.decode(data);
    }
    return result;
}

describe("renderEpub — nav document presence", () => {
    it("always writes nav.xhtml to the zip even when includeToc is false", async () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            includeToc: false,
            includeCoverImage: false,
            includeCoverPage: false,
        };
        const blob = await renderEpub(makeFicData(), settings);
        const files = await unzipEpub(blob);
        expect(Object.keys(files)).toContain("OEBPS/nav.xhtml");
    });

    it("includes nav item with properties=\"nav\" in manifest when includeToc is false", async () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            includeToc: false,
            includeCoverImage: false,
            includeCoverPage: false,
        };
        const blob = await renderEpub(makeFicData(), settings);
        const files = await unzipEpub(blob);
        expect(files["OEBPS/content.opf"]).toContain('properties="nav"');
    });

    it("excludes nav itemref from spine when includeToc is false", async () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            includeToc: false,
            includeCoverImage: false,
            includeCoverPage: false,
        };
        const blob = await renderEpub(makeFicData(), settings);
        const files = await unzipEpub(blob);
        expect(files["OEBPS/content.opf"]).not.toContain('<itemref idref="nav"');
    });

    it("adds hidden attribute to nav element when includeToc is false", async () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            includeToc: false,
            includeCoverImage: false,
            includeCoverPage: false,
        };
        const blob = await renderEpub(makeFicData(), settings);
        const files = await unzipEpub(blob);
        expect(files["OEBPS/nav.xhtml"]).toContain('hidden=""');
    });

    it("includes nav in both manifest and spine when includeToc is true", async () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            includeToc: true,
            includeCoverImage: false,
            includeCoverPage: false,
        };
        const blob = await renderEpub(makeFicData(), settings);
        const files = await unzipEpub(blob);
        expect(Object.keys(files)).toContain("OEBPS/nav.xhtml");
        expect(files["OEBPS/content.opf"]).toContain('properties="nav"');
        expect(files["OEBPS/content.opf"]).toContain('<itemref idref="nav"');
    });

    it("does not add hidden attribute to nav element when includeToc is true", async () => {
        const settings = {
            ...DEFAULT_SETTINGS,
            includeToc: true,
            includeCoverImage: false,
            includeCoverPage: false,
        };
        const blob = await renderEpub(makeFicData(), settings);
        const files = await unzipEpub(blob);
        expect(files["OEBPS/nav.xhtml"]).not.toContain('hidden=""');
    });
});

describe("renderEpub — embedded image remapping", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remaps chapter img srcs to the embedded image path without touching prose", async () => {
    // remapImageSrcs needs DOMParser, which the node environment lacks
    vi.stubGlobal("DOMParser", new JSDOM().window.DOMParser);

    const imageUrl = "https://example.com/pic.png?a=1&b=2";
    const ficData = makeFicData();
    ficData.core.images = [
      { url: imageUrl, mimeType: "image/png", data: new Uint8Array([1, 2, 3]).buffer },
    ];
    ficData.core.chapters = [
      {
        index: 0,
        title: "Chapter One",
        // As produced by sanitizeHtml: attribute ampersands are entity-escaped
        htmlContent: `<p>See https://example.com/pic.png?a=1&amp;b=2 inline.</p><img src="https://example.com/pic.png?a=1&amp;b=2" alt="pic"/>`,
      },
    ];
    const settings = {
      ...DEFAULT_SETTINGS,
      includeCoverImage: false,
      includeCoverPage: false,
    };

    const blob = await renderEpub(ficData, settings);
    const files = await unzipEpub(blob);

    expect(Object.keys(files)).toContain("OEBPS/images/img-0.png");
    expect(files["OEBPS/chapter-0.xhtml"]).toContain('src="images/img-0.png"');
    // Prose text mentioning the URL must not be rewritten
    expect(files["OEBPS/chapter-0.xhtml"]).toContain("See https://example.com/pic.png?a=1&amp;b=2 inline.");
  });
});

describe("renderEpub — SVG cover image MIME type", () => {
    it("uses image/svg+xml as the manifest media-type when the cover is an SVG", async () => {
        vi.mocked(fetchCoverImage).mockResolvedValue({
            data: new Uint8Array([1]),
            extension: "svg",
            mimeType: "image/svg+xml",
        });
        const ficData = makeFicData();
        ficData.core.coverImageUrl = "https://example.com/cover.svg";
        const settings = {
            ...DEFAULT_SETTINGS,
            includeCoverImage: true,
            includeCoverPage: false,
        };
        const blob = await renderEpub(ficData, settings);
        const files = await unzipEpub(blob);
        expect(files["OEBPS/content.opf"]).toContain('media-type="image/svg+xml"');
        expect(files["OEBPS/content.opf"]).not.toContain('media-type="image/svg"');
    });
});
