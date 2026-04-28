import type { FicData, FicCore, RoyalRoadMetadata, FicChapter } from "../shared/types.js";
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

const FICTION_ID_PATTERN = /royalroad\.com\/fiction\/(\d+)/;

function fictionUrl(fictionId: string): string {
  return `https://www.royalroad.com/fiction/${fictionId}`;
}

function chapterUrl(chapterPath: string): string {
  return `https://www.royalroad.com${chapterPath}`;
}

function extractFictionId(url: string): string | null {
  return FICTION_ID_PATTERN.exec(url)?.[1] ?? null;
}

interface ChapterListing {
  title: string;
  path: string;
  date: Date | null;
}

function extractChapterListing(doc: Document): ChapterListing[] {
  const rows = Array.from(doc.querySelectorAll("table#chapters tbody tr"));
  return rows.map((row) => {
    const link = row.querySelector("a[href]");
    const title = link?.textContent?.trim() ?? "Untitled";
    const path = link?.getAttribute("href") ?? "";
    const timeEl = row.querySelector("time");
    const date = timeEl ? parseDate(timeEl.getAttribute("datetime") ?? "") : null;
    return { title, path, date };
  });
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const fictionId = extractFictionId(url);
  if (!fictionId) throw new Error(`Not a valid Royal Road URL: ${url}`);

  const fictionDoc = await fetchHtml(fictionUrl(fictionId));
  const sourceUrl = fictionUrl(fictionId);

  const title = textContent(fictionDoc.querySelector(".fiction-title h1, h1.font-white"));
  const author = textContent(fictionDoc.querySelector(".fiction-title .author span, a[href*='/profile/']"));
  const summaryEl = fictionDoc.querySelector(".description .hidden-content, .description");
  const summary = summaryEl ? sanitizeHtml(summaryEl.innerHTML) : null;

  const tags = Array.from(fictionDoc.querySelectorAll(".tags a, .fiction-tag"))
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean);

  // RR uses bg-blue-hoki for both content-type badges and status — must match by text
  const statusEl = Array.from(fictionDoc.querySelectorAll(".label-sm")).find(
    (el) => /completed|ongoing|hiatus|stub|dropped/i.test(el.textContent ?? ""),
  );
  const statusText = (statusEl?.textContent?.trim() ?? "").toLowerCase();
  const status = statusText.includes("complete") ? "complete" as const
    : statusText.includes("ongoing") ? "in-progress" as const
    : "unknown" as const;

  // Followers/views/rating are JS-rendered on RR; these will be null from static HTML
  const followersText = textContent(fictionDoc.querySelector(".fiction-stats .followers-count, .stats-followers"));
  const ratingText = textContent(fictionDoc.querySelector(".fiction-stats .rating-score, .stats-rating"));
  const viewsText = textContent(fictionDoc.querySelector(".fiction-stats .views-count, .stats-views"));

  const chapterListing = extractChapterListing(fictionDoc);
  if (chapterListing.length === 0) throw new Error("No chapters found on Royal Road fiction page");

  const publishDate = chapterListing[0]?.date ?? null;
  const updateDate = chapterListing[chapterListing.length - 1]?.date ?? null;

  const chapters: FicChapter[] = await Promise.all(
    chapterListing.map(async (listing, index) => {
      const chapterDoc = await fetchHtml(chapterUrl(listing.path));
      const content = chapterDoc.querySelector(".chapter-content");
      const htmlContent = content ? sanitizeHtml(content.innerHTML) : "";
      return { index, title: listing.title, htmlContent };
    }),
  );

  let images: FicCore["images"] = [];
  if (settings.includeImages) {
    const imageUrls = chapters.flatMap((chapter) => collectImageUrls(chapter.htmlContent, sourceUrl));
    images = await fetchImages([...new Set(imageUrls)]);
  }

  const core: FicCore = {
    title: title || "Untitled",
    author: author || "Unknown",
    summary,
    chapters,
    images,
    tags,
    status,
    wordCount: null,
    publishDate,
    updateDate,
    sourceUrl,
  };

  const meta: RoyalRoadMetadata = {
    tags,
    followers: parseCount(followersText),
    rating: parseCount(ratingText),
    views: parseCount(viewsText),
  };

  return { site: "royalroad", core, meta };
}

export const royalRoadParser: Parser = {
  pattern: FICTION_ID_PATTERN,
  parse,
};
