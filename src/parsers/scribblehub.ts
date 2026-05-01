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

// Matches both series pages (/series/ID/) and chapter pages (/read/ID-)
const SERIES_URL_PATTERN = /scribblehub\.com\/series\/(\d+)/;
const CHAPTER_URL_PATTERN = /scribblehub\.com\/read\/(\d+)-/;

function seriesUrl(seriesId: string): string {
  return `https://www.scribblehub.com/series/${seriesId}/`;
}

function resolveSeriesId(url: string): string | null {
  return SERIES_URL_PATTERN.exec(url)?.[1] ?? CHAPTER_URL_PATTERN.exec(url)?.[1] ?? null;
}

interface ChapterListing {
  title: string;
  url: string;
  date: Date | null;
}

function statValue(doc: Document, label: string): number | null {
  for (const item of Array.from(doc.querySelectorAll(".st_item"))) {
    if (item.querySelector(".mb_stat")?.textContent?.trim() === label) {
      return parseCount(item.textContent ?? "");
    }
  }
  return null;
}

function tableStatValue(doc: Document, label: string): number | null {
  for (const th of Array.from(doc.querySelectorAll("th"))) {
    if (th.textContent?.trim() === label) {
      return parseCount(th.nextElementSibling?.textContent ?? "");
    }
  }
  return null;
}

function parseListingsFromDoc(doc: Document): ChapterListing[] {
  return Array.from(doc.querySelectorAll("li.toc_w")).flatMap((item) => {
    const link = item.querySelector("a.toc_a");
    const url = link?.getAttribute("href") ?? "";
    if (!url) return [];
    const title = link?.textContent?.trim() ?? "Untitled";
    const dateEl = item.querySelector("span.fic_date_pub");
    // Use title attribute for absolute dates; text content is often relative ("6 mins ago")
    const dateStr = dateEl?.getAttribute("title") ?? dateEl?.textContent ?? "";
    return [{ title, url, date: parseDate(dateStr) }];
  });
}

async function fetchChapterList(seriesId: string, seriesDoc: Document): Promise<ChapterListing[]> {
  try {
    // ScribbleHub loads its TOC via WordPress AJAX
    const response = await enqueue("https://www.scribblehub.com/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `action=wi_getreleases_long&pagenum=1&mypostid=${seriesId}`,
    });
    if (response.ok) {
      const html = await response.text();
      const tocDoc = new DOMParser().parseFromString(html, "text/html");
      const listings = parseListingsFromDoc(tocDoc);
      if (listings.length > 0) return listings;
    }
  } catch { }
  // Fall back to TOC items embedded in the series page itself
  return parseListingsFromDoc(seriesDoc);
}

async function fetchWordCount(canonicalUrl: string): Promise<number | null> {
  if (!canonicalUrl) return null;
  try {
    const statsUrl = canonicalUrl.endsWith("/") ? `${canonicalUrl}stats/` : `${canonicalUrl}/stats/`;
    const doc = await fetchHtml(statsUrl);
    return tableStatValue(doc, "Word Count:");
  } catch {
    return null;
  }
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const seriesId = resolveSeriesId(url);
  if (!seriesId) throw new Error(`Not a valid ScribbleHub URL: ${url}`);
  const sourceUrl = seriesUrl(seriesId);

  const doc = await fetchHtml(sourceUrl);

  const title = textContent(doc.querySelector(".fic_title")) || "Untitled";
  const author = textContent(doc.querySelector('[property="author"] .auth_name_fic, .auth_name_fic')) || "Unknown";
  const summaryEl = doc.querySelector(".wi_fic_desc");
  const summary = summaryEl ? sanitizeHtml(summaryEl.innerHTML) : null;

  const tags = Array.from(doc.querySelectorAll(".wi_fic_showtags a"))
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean);

  const genres = Array.from(doc.querySelectorAll(".wi_fic_genre a"))
    .map((el) => el.textContent?.trim() ?? "")
    .filter(Boolean);

  // Status is the text in the span following the .rnd_stats badge with the status icon
  const statusSpan = doc.querySelector("i.fa.status")?.parentElement?.nextElementSibling;
  const statusText = (statusSpan?.textContent ?? "").toLowerCase();
  const status = statusText.includes("complet") ? "complete" as const
    : statusText.includes("ongoing") ? "in-progress" as const
    : "unknown" as const;

  const views = statValue(doc, "Views");
  const favorites = statValue(doc, "Favorites");

  // Use canonical URL directly to construct stats page URL
  const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? "";

  const [listings, wordCount] = await Promise.all([
    fetchChapterList(seriesId, doc),
    fetchWordCount(canonical),
  ]);
  if (listings.length === 0) throw new Error("No chapters found on ScribbleHub series page");

  // AJAX returns chapters newest-first; compute dates before reversing
  const publishDate = listings[listings.length - 1]?.date ?? null;
  const updateDate = listings[0]?.date ?? null;

  const chapters: FicChapter[] = await Promise.all(
    listings.reverse().map(async (listing, index) => {
      const chapterDoc = await fetchHtml(listing.url);
      const content = chapterDoc.querySelector("#chp_raw, .chp_raw");
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
    wordCount,
    publishDate,
    updateDate,
    sourceUrl,
  };

  const meta: ScribbleHubMetadata = {
    tags,
    genres,
    rating: null, // loaded dynamically via AJAX on the series page
    views,
    favorites,
  };

  return { site: "scribblehub", core, meta };
}

export const scribbleHubParser: Parser = {
  pattern: /scribblehub\.com\/(?:series\/\d+|read\/\d+-)/,
  parse,
};
