import type { FicData, FicCore, ScribbleHubMetadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import {
  fetchHtml,
  ogImage,
  sanitizeHtml,
  resolveImageSrcs,
  textContent,
  parseCount,
  parseDate,
  collectImageUrls,
  fetchImages,
  type Parser,
} from "./common.js";
import { enqueue } from "../background/request-queue.js";

const SERIES_PATTERN = /scribblehub\.com\/series\/(\d+)\//;

function seriesUrl(seriesId: string): string {
  return `https://www.scribblehub.com/series/${seriesId}/`;
}

interface ChapterListing {
  title: string;
  url: string;
  date: Date | null;
}

async function fetchChapterList(seriesId: string): Promise<ChapterListing[]> {
  // ScribbleHub loads its TOC via WordPress AJAX
  const response = await enqueue("https://www.scribblehub.com/wp-admin/admin-ajax.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `action=wi_getreleases_long&pagenum=1&mypostid=${seriesId}`,
  });
  if (!response.ok) throw new Error(`Failed to fetch ScribbleHub chapter list: HTTP ${response.status}`);
  const html = await response.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  return Array.from(doc.querySelectorAll("li.toc_w, li.chapter-item")).flatMap((item) => {
    const link = item.querySelector("a");
    const url = link?.getAttribute("href") ?? "";
    if (!url) return [];
    const title = link?.textContent?.trim() ?? "Untitled";
    const timeEl = item.querySelector("span.chapter-date, time");
    const date = timeEl ? parseDate(timeEl.getAttribute("datetime") ?? timeEl.textContent ?? "") : null;
    return [{ title, url, date }];
  });
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const match = SERIES_PATTERN.exec(url);
  if (!match) throw new Error(`Not a valid ScribbleHub URL: ${url}`);
  const seriesId = match[1]!;
  const sourceUrl = seriesUrl(seriesId);

  const doc = await fetchHtml(sourceUrl);

  const title = textContent(doc.querySelector(".fic-title .fiction-title, .fic_title, h1.fic-title")) || "Untitled";
  const author = textContent(doc.querySelector(".author a, .mb-author a")) || "Unknown";
  const summaryEl = doc.querySelector(".wi_fic_desc, .fic-desc .desc");
  const summary = summaryEl ? sanitizeHtml(summaryEl.innerHTML) : null;

  const tags = Array.from(doc.querySelectorAll(".wi_fic_showtags a, .tags .tagx"))
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean);

  const genres = Array.from(doc.querySelectorAll(".wi_fic_genre a, .genre a"))
    .map((element) => element.textContent?.trim() ?? "")
    .filter(Boolean);

  const rating = textContent(doc.querySelector(".cnt-rate, .rating-summary")) || null;
  const viewsText = textContent(doc.querySelector(".cnt-stat-wrap span[title='Views'] strong, .cnt-views"));
  const favoritesText = textContent(doc.querySelector(".cnt-stat-wrap span[title='Bookmarks'] strong, .cnt-favs"));

  const statusText = textContent(doc.querySelector(".ongoing, .hiatus, .completed, .status")).toLowerCase();
  const status = statusText.includes("complet") ? "complete" as const
    : statusText.includes("ongoing") ? "in-progress" as const
    : "unknown" as const;

  const listings = await fetchChapterList(seriesId);
  if (listings.length === 0) throw new Error("No chapters found on ScribbleHub series page");

  const publishDate = listings[listings.length - 1]?.date ?? null;
  const updateDate = listings[0]?.date ?? null;

  const chapters: FicChapter[] = await Promise.all(
    listings.reverse().map(async (listing, index) => {
      const chapterDoc = await fetchHtml(listing.url);
      const content = chapterDoc.querySelector(".wi_fic_text, .chp-raw");
      const htmlContent = content ? resolveImageSrcs(sanitizeHtml(content.innerHTML), listing.url) : "";
      return { index, title: listing.title, htmlContent };
    }),
  );

  let images: FicCore["images"] = [];
  if (settings.includeImages) {
    const imageUrls = chapters.flatMap((chapter) => collectImageUrls(chapter.htmlContent, sourceUrl));
    images = await fetchImages([...new Set(imageUrls)]);
  }

  const core: FicCore = {
    title,
    author,
    summary,
    chapters,
    images,
    coverImageUrl: ogImage(doc),
    tags,
    status,
    wordCount: null,
    publishDate,
    updateDate,
    sourceUrl,
  };

  const meta: ScribbleHubMetadata = {
    tags,
    genres,
    rating: rating || null,
    views: parseCount(viewsText),
    favorites: parseCount(favoritesText),
  };

  return { site: "scribblehub", core, meta };
}

export const scribbleHubParser: Parser = {
  pattern: SERIES_PATTERN,
  parse,
};
