import type { FicData, FicCore, AO3Metadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import {
  fetchHtml,
  fetchImages,
  sanitizeHtml,
  textContent,
  parseCount,
  parseDate,
  collectImageUrls,
  type Parser,
} from "./common.js";

const WORK_ID_PATTERN = /archiveofourown\.org\/works\/(\d+)/;

function workUrl(workId: string): string {
  return `https://archiveofourown.org/works/${workId}?view_full_work=true&view_adult=true`;
}

function extractWorkId(url: string): string | null {
  return WORK_ID_PATTERN.exec(url)?.[1] ?? null;
}

function extractTags(doc: Document, selector: string): string[] {
  return Array.from(doc.querySelectorAll(selector))
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean);
}

function extractSeries(doc: Document): AO3Metadata["series"] {
  const series: AO3Metadata["series"] = [];
  for (const link of Array.from(doc.querySelectorAll("dd.series a"))) {
    const name = link.textContent?.trim() ?? "";
    const partMatch = link.closest("dd")?.textContent?.match(/Part\s+(\d+)/i);
    const part = partMatch ? parseInt(partMatch[1] ?? "1", 10) : 1;
    if (name) series.push({ name, part });
  }
  return series;
}

function extractChapters(doc: Document, includeAuthorNotes: boolean): FicChapter[] {
  const chapters: FicChapter[] = [];
  const chapterDivs = doc.querySelectorAll("#chapters > .chapter");

  if (chapterDivs.length === 0) {
    // Single-chapter work — the content is directly in #chapters
    const content = doc.querySelector("#chapters .userstuff");
    if (content) {
      for (const landmark of Array.from(content.querySelectorAll(".landmark"))) landmark.remove();
      chapters.push({ index: 0, title: null, htmlContent: sanitizeHtml(content.innerHTML) });
    }
    return chapters;
  }

  for (const [index, chapterDiv] of Array.from(chapterDivs).entries()) {
    const titleEl = chapterDiv.querySelector(".title");
    const title = titleEl?.textContent?.replace(/Chapter\s+\d+:\s*/i, "").trim() ?? null;

    let html = "";

    if (includeAuthorNotes) {
      const preNotes = chapterDiv.querySelector(".chapter.preface.group .notes .userstuff");
      if (preNotes) html += preNotes.innerHTML;
    }

    const content = chapterDiv.querySelector(".userstuff");
    if (content) {
      for (const landmark of Array.from(content.querySelectorAll(".landmark"))) landmark.remove();
      html += content.innerHTML;
    }

    if (includeAuthorNotes) {
      const postNotes = chapterDiv.querySelector(".chapter.endnotes .userstuff");
      if (postNotes) html += postNotes.innerHTML;
    }

    chapters.push({ index, title, htmlContent: sanitizeHtml(html) });
  }

  return chapters;
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const workId = extractWorkId(url);
  if (!workId) throw new Error(`Not a valid AO3 URL: ${url}`);

  const doc = await fetchHtml(workUrl(workId));
  const sourceUrl = `https://archiveofourown.org/works/${workId}`;

  const title = textContent(doc.querySelector("h2.title.heading"));
  const author = textContent(doc.querySelector("h3.byline.heading a"));
  const summaryBlockquote = doc.querySelector(".summary.module blockquote.userstuff");
  const summary = summaryBlockquote?.innerHTML ?? null;

  const wordCountText = textContent(doc.querySelector("dd.words"));
  const wordCount = parseCount(wordCountText);

  const statusText = textContent(doc.querySelector("dd.status")).toLowerCase();
  const status =
    statusText.includes("complete") ? "complete"
    : statusText.includes("progress") ? "in-progress"
    : "unknown";

  const publishDate = parseDate(
    doc.querySelector("dd.published")?.getAttribute("datetime") ??
    textContent(doc.querySelector("dd.published")),
  );
  const updateDate = parseDate(textContent(doc.querySelector("dd.status")));

  const chapters = extractChapters(doc, settings.includeAuthorNotes);

  let images: FicData["core"]["images"] = [];
  if (settings.includeImages) {
    const imageUrls = chapters.flatMap((chapter) =>
      collectImageUrls(chapter.htmlContent, sourceUrl),
    );
    images = await fetchImages([...new Set(imageUrls)]);
  }

  const core: FicCore = {
    title: title || "Untitled",
    author: author || "Unknown",
    summary: summary ? sanitizeHtml(summary) : null,
    chapters,
    images,
    tags: extractTags(doc, "dd.freeform.tags a.tag"),
    status,
    wordCount,
    publishDate,
    updateDate,
    sourceUrl,
  };

  const meta: AO3Metadata = {
    fandoms: extractTags(doc, "dd.fandom.tags a.tag"),
    relationships: extractTags(doc, "dd.relationship.tags a.tag"),
    characters: extractTags(doc, "dd.character.tags a.tag"),
    additionalTags: extractTags(doc, "dd.freeform.tags a.tag"),
    warnings: extractTags(doc, "dd.warning.tags a.tag"),
    rating: textContent(doc.querySelector("dd.rating.tags a.tag")) || null,
    kudos: parseCount(textContent(doc.querySelector("dd.kudos"))),
    bookmarks: parseCount(textContent(doc.querySelector("dd.bookmarks a"))),
    hits: parseCount(textContent(doc.querySelector("dd.hits"))),
    language: textContent(doc.querySelector("dd.language")) || null,
    series: extractSeries(doc),
  };

  return { site: "ao3", core, meta };
}

export const ao3Parser: Parser = {
  pattern: WORK_ID_PATTERN,
  parse,
};
