import { describe, it, expect, vi } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { DEFAULT_SETTINGS } from "../../shared/settings.js";
import type { FicData } from "../../shared/types.js";

vi.mock("../../background/request-queue.js", () => ({
  enqueue: vi.fn(),
  requestQueue: { enqueue: vi.fn() },
  createQueue: vi.fn(),
}));

const { renderDocx } = await import("../../renderers/docx.js");

function makeFicData(chapterHtml: string): FicData {
  return {
    site: "ao3",
    core: {
      title: "Docx Test Story",
      author: "Test Author",
      summary: null,
      chapters: [{ index: 0, title: "Chapter One", htmlContent: chapterHtml }],
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

async function renderDocumentXml(chapterHtml: string): Promise<string> {
  const settings = { ...DEFAULT_SETTINGS, includeCoverPage: false, includeCoverImage: false };
  const blob = await renderDocx(makeFicData(chapterHtml), settings);
  const files = unzipSync(new Uint8Array(await blob.arrayBuffer()));
  const documentXml = files["word/document.xml"];
  expect(documentXml).toBeDefined();
  return strFromU8(documentXml!);
}

describe("renderDocx — inline formatting", () => {
  it("emits bold and italic runs for strong/em instead of flattening to plain text", async () => {
    const xml = await renderDocumentXml(
      "<p>plain <strong>heavy</strong> and <em>slanted</em> text</p>",
    );
    // Bold run: <w:r><w:rPr>…<w:b/>…</w:rPr><w:t>heavy</w:t></w:r>
    expect(xml).toMatch(/<w:b\/>[^<]*(<[^>]+>)*[^<]*heavy/);
    expect(xml).toMatch(/<w:i\/>[^<]*(<[^>]+>)*[^<]*slanted/);
    expect(xml).toContain("plain ");
  });

  it("emits a combined bold-italic run for nested strong+em", async () => {
    const xml = await renderDocumentXml("<p><strong><em>both</em></strong></p>");
    const runMatch = /<w:r><w:rPr>(.*?)<\/w:rPr><w:t[^>]*>both<\/w:t>/.exec(xml);
    expect(runMatch).not.toBeNull();
    expect(runMatch![1]).toContain("<w:b/>");
    expect(runMatch![1]).toContain("<w:i/>");
  });

  it("renders list items as bullet paragraphs preserving inline formatting", async () => {
    const xml = await renderDocumentXml("<ul><li>item <b>bolded</b></li></ul>");
    expect(xml).toMatch(/<w:b\/>[^<]*(<[^>]+>)*[^<]*bolded/);
    expect(xml).toContain("item ");
  });

  it("keeps formatting in headings", async () => {
    const xml = await renderDocumentXml("<h2>heading <em>flair</em></h2>");
    expect(xml).toMatch(/<w:i\/>[^<]*(<[^>]+>)*[^<]*flair/);
  });
});
