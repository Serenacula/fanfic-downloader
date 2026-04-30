import type { FicData, FicCore, RoyalRoadMetadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import {
  fetchHtml,
  ogImage,
  fetchImages,
  sanitizeHtml,
  resolveImageSrcs,
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

// Stats are label/value alternating <li> pairs under .stats-content
function findStatValue(doc: Document, label: string): string {
  const items = Array.from(doc.querySelectorAll(".stats-content li"));
  for (let i = 0; i < items.length - 1; i++) {
    if (items[i]?.textContent?.trim().startsWith(label)) {
      return items[i + 1]?.textContent?.trim() ?? "";
    }
  }
  return "";
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

  const title = textContent(fictionDoc.querySelector(".fic-title h1, h1.font-white"));
  // .fic-title is the fiction header container; scoping avoids matching "My Profile" in nav
  const author = textContent(fictionDoc.querySelector(".fic-title h4 a, h4.font-white a"));
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

  // Stats are in alternating label/value <li> pairs under .stats-content
  const views = parseCount(findStatValue(fictionDoc, "Total Views"));
  const followers = parseCount(findStatValue(fictionDoc, "Followers"));
  const favorites = parseCount(findStatValue(fictionDoc, "Favorites"));
  const ratingCount = parseCount(findStatValue(fictionDoc, "Ratings"));

  // Overall Score is a decimal; may be absent if not enough ratings yet
  const overallScoreText = findStatValue(fictionDoc, "Overall Score");
  const ratingScore = parseFloat(overallScoreText);
  const rating = isNaN(ratingScore) ? null : ratingScore;

  // Word count is embedded in the Pages tooltip data-content attribute
  const pagesDataContent = fictionDoc
    .querySelector(".stats-content i[data-content*='words.']")
    ?.getAttribute("data-content") ?? "";
  const wordMatch = /calculated from ([\d,]+) words/i.exec(pagesDataContent);
  const wordCount = wordMatch ? parseCount(wordMatch[1]!) : null;

  const chapterListing = extractChapterListing(fictionDoc);
  if (chapterListing.length === 0) throw new Error("No chapters found on Royal Road fiction page");

  const publishDate = chapterListing[0]?.date ?? null;
  const updateDate = chapterListing[chapterListing.length - 1]?.date ?? null;

  const chapters: FicChapter[] = await Promise.all(
    chapterListing.map(async (listing, index) => {
      const chapterPageUrl = chapterUrl(listing.path);
      const chapterDoc = await fetchHtml(chapterPageUrl);
      const content = chapterDoc.querySelector(".chapter-content");
      if (content) {
        // Watermark spans injected at paragraph level — remove before sanitizing
        for (const span of Array.from(content.querySelectorAll(":scope > span"))) {
          span.remove();
        }
      }
      const htmlContent = content ? resolveImageSrcs(sanitizeHtml(content.innerHTML), chapterPageUrl) : "";
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
    coverImageUrl: ogImage(fictionDoc),
    tags,
    status,
    wordCount,
    publishDate,
    updateDate,
    sourceUrl,
  };

  const meta: RoyalRoadMetadata = {
    tags,
    rating,
    ratingCount,
    views,
    followers,
    favorites,
  };

  return { site: "royalroad", core, meta };
}

export const royalRoadParser: Parser = {
  pattern: FICTION_ID_PATTERN,
  parse,
};
