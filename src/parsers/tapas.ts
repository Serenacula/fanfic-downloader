import type { FicData, FicCore, TapasMetadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import {
  fetchHtml,
  ogImage,
  sanitizeHtml,
  resolveImageSrcs,
  textContent,
  collectImageUrls,
  fetchImages,
  parseDate,
  type Parser,
} from "./common.js";
import { enqueue } from "../background/request-queue.js";

const SERIES_PATTERN = /tapas\.io\/series\/([^/?#]+)/;

function seriesInfoUrl(slug: string): string {
  return `https://tapas.io/series/${slug}/info`;
}

function episodeUrl(path: string): string {
  return path.startsWith("http") ? path : `https://tapas.io${path}`;
}

interface TapasEpisodesApiResponse {
  code?: number;
  data?: {
    pagination?: { page?: number; has_next?: boolean; since?: number };
    body?: string;
  };
}

interface EpisodeListing {
  title: string;
  url: string;
  date: Date | null;
}

function extractSeriesId(doc: Document): string | null {
  for (const name of ["twitter:app:url:googleplay", "twitter:app:url:iphone", "twitter:app:url:ipad"]) {
    const content = doc.querySelector(`meta[name="${name}"]`)?.getAttribute("content") ?? "";
    const match = /tapastic:\/\/series\/(\d+)/.exec(content);
    if (match) return match[1]!;
  }
  const dataEl = doc.querySelector("[data-series-id]");
  if (dataEl) {
    const id = dataEl.getAttribute("data-series-id");
    if (id && /^\d+$/.test(id)) return id;
  }
  for (const element of Array.from(doc.querySelectorAll("a[href]"))) {
    const href = element.getAttribute("href") ?? "";
    const match = /[?&]series_id=(\d+)/.exec(href);
    if (match) return match[1]!;
  }
  return null;
}

function parseEpisodeHtml(html: string): EpisodeListing[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const listings: EpisodeListing[] = [];
  for (const item of Array.from(doc.querySelectorAll("li[data-id]"))) {
    const href = item.getAttribute("data-href") ?? item.getAttribute("data-permalink") ?? "";
    const dataId = item.getAttribute("data-id") ?? "";
    const path = href || (dataId ? `/episode/${dataId}` : "");
    if (!path) continue;
    const title = item.querySelector(".info__title, a.info__title")?.textContent?.trim() ?? "Untitled";
    listings.push({ title, url: episodeUrl(path), date: null });
  }
  return listings;
}

async function fetchAllEpisodes(seriesId: string): Promise<EpisodeListing[]> {
  const listings: EpisodeListing[] = [];
  let page = 1;
  let since: number | undefined;

  while (true) {
    let apiUrl = `https://tapas.io/series/${seriesId}/episodes?page=${page}&sort=OLDEST`;
    if (since !== undefined) apiUrl += `&since=${since}`;

    const response = await enqueue(apiUrl);
    if (!response.ok) {
      if (listings.length === 0) throw new Error(`Tapas episode API returned ${response.status}`);
      break;
    }

    const data = (await response.json()) as TapasEpisodesApiResponse;
    if (data.code !== 200 || !data.data?.body) break;

    const pageListings = parseEpisodeHtml(data.data.body);
    if (pageListings.length === 0) break;
    listings.push(...pageListings);

    if (!data.data.pagination?.has_next) break;
    since = data.data.pagination.since;
    page++;
  }

  return listings;
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const match = SERIES_PATTERN.exec(url);
  if (!match) throw new Error(`Not a valid Tapas URL: ${url}`);
  const slug = match[1]!;
  const fetchUrl = seriesInfoUrl(slug);
  const sourceUrl = `https://tapas.io/series/${slug}`;

  const doc = await fetchHtml(fetchUrl);

  const title = textContent(doc.querySelector("p.title")) || "Untitled";
  const author = textContent(doc.querySelector(".creator a, a.creator__item")) || "Unknown";
  const summaryEl = doc.querySelector(".description__body");
  const summary = summaryEl ? sanitizeHtml(summaryEl.innerHTML) : null;
  const genre = textContent(doc.querySelector("a[href*='genre_name=']")) || null;

  const statusText = textContent(doc.querySelector(".series-status, .info-body__status")).toLowerCase();
  const status = statusText.includes("complet") ? "complete" as const
    : statusText.includes("ongoing") ? "in-progress" as const
    : "unknown" as const;

  const seriesId = extractSeriesId(doc);
  if (!seriesId) throw new Error(`Could not find Tapas series ID for: ${url}`);

  const listings = await fetchAllEpisodes(seriesId);
  if (listings.length === 0) throw new Error("No episodes found for Tapas series (series may require login or have no published episodes)");

  const publishDate = listings[0]?.date ?? null;
  const updateDate = listings[listings.length - 1]?.date ?? null;

  const chapters: FicChapter[] = await Promise.all(
    listings.map(async (listing, index) => {
      const chapterDoc = await fetchHtml(listing.url);
      const content = chapterDoc.querySelector(
        ".viewer__body, .viewer__row, .viewer-row, .content-viewer, .prose-content, .novel-body",
      );
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
