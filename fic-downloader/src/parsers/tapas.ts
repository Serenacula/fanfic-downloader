import type { FicData, FicCore, TapasMetadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import {
  fetchHtml,
  sanitizeHtml,
  textContent,
  collectImageUrls,
  fetchImages,
  parseDate,
  type Parser,
} from "./common.js";

const SERIES_PATTERN = /tapas\.io\/series\/([^/?#]+)/;

function seriesInfoUrl(slug: string): string {
  return `https://tapas.io/series/${slug}/info`;
}

function episodeUrl(path: string): string {
  return path.startsWith("http") ? path : `https://tapas.io${path}`;
}

interface EpisodeListing {
  title: string;
  url: string;
  date: Date | null;
}

function extractEpisodeListings(doc: Document): EpisodeListing[] {
  const items = Array.from(doc.querySelectorAll(".episode-item, .episode__row"));
  return items.flatMap((item) => {
    const link = item.querySelector("a");
    const url = link?.getAttribute("href") ?? "";
    if (!url) return [];
    const title = link?.querySelector(".title, .episode__title")?.textContent?.trim()
      ?? link?.textContent?.trim()
      ?? "Untitled";
    const timeEl = item.querySelector("time, .date");
    const date = timeEl ? parseDate(timeEl.getAttribute("datetime") ?? timeEl.textContent ?? "") : null;
    return [{ title, url, date }];
  });
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const match = SERIES_PATTERN.exec(url);
  if (!match) throw new Error(`Not a valid Tapas URL: ${url}`);
  const slug = match[1]!;
  const sourceUrl = seriesInfoUrl(slug);

  const doc = await fetchHtml(sourceUrl);

  const title = textContent(doc.querySelector(".info-body__title, .series-header__title, h1")) || "Untitled";
  const author = textContent(doc.querySelector(".creator-info__name, .creator__name, .author")) || "Unknown";
  const summaryEl = doc.querySelector(".description--collapsible, .info-body__desc");
  const summary = summaryEl ? sanitizeHtml(summaryEl.innerHTML) : null;
  const genre = textContent(doc.querySelector(".info-body__genre a, .genre-tag")) || null;

  const statusText = textContent(doc.querySelector(".series-status, .info-body__status")).toLowerCase();
  const status = statusText.includes("complet") ? "complete" as const
    : statusText.includes("ongoing") ? "in-progress" as const
    : "unknown" as const;

  const listings = extractEpisodeListings(doc);
  if (listings.length === 0) throw new Error("No episodes found on Tapas series page");

  const publishDate = listings[0]?.date ?? null;
  const updateDate = listings[listings.length - 1]?.date ?? null;

  const chapters: FicChapter[] = await Promise.all(
    listings.map(async (listing, index) => {
      const chapterDoc = await fetchHtml(episodeUrl(listing.url));
      const content = chapterDoc.querySelector(".viewer__row, .viewer-row, .content-viewer");
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
    title,
    author,
    summary,
    chapters,
    images,
    tags: [],
    status,
    wordCount: null,
    publishDate,
    updateDate,
    sourceUrl,
  };

  const meta: TapasMetadata = { genre };

  return { site: "tapas", core, meta };
}

export const tapasParser: Parser = {
  pattern: SERIES_PATTERN,
  parse,
};
