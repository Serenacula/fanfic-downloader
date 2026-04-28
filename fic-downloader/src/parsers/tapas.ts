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
import { enqueue } from "../background/request-queue.js";

const SERIES_PATTERN = /tapas\.io\/series\/([^/?#]+)/;

function seriesInfoUrl(slug: string): string {
  return `https://tapas.io/series/${slug}/info`;
}

function episodeUrl(path: string): string {
  return path.startsWith("http") ? path : `https://tapas.io${path}`;
}

interface TapasEpisode {
  id?: number;
  title?: string;
  info?: { uri?: string };
  publish_date?: string;
  date?: string;
}

interface TapasEpisodesResponse {
  data?: { episodes?: TapasEpisode[]; has_next?: boolean };
  episodes?: TapasEpisode[];
}

interface EpisodeListing {
  title: string;
  url: string;
  date: Date | null;
}

function extractSeriesId(doc: Document): string | null {
  // Series ID appears in subscriber/other links as ?series_id=12345
  for (const link of Array.from(doc.querySelectorAll("a[href]"))) {
    const match = /[?&]series_id=(\d+)/.exec(link.getAttribute("href") ?? "");
    if (match) return match[1]!;
  }
  return null;
}

function parseEpisodesResponse(data: TapasEpisodesResponse): TapasEpisode[] {
  return data.data?.episodes ?? data.episodes ?? [];
}

async function fetchAllEpisodes(seriesId: string): Promise<EpisodeListing[]> {
  const listings: EpisodeListing[] = [];
  let page = 1;

  while (true) {
    const apiUrl = `https://tapas.io/api/tapastic/series/${seriesId}/episodes?page=${page}&size=50`;
    const response = await enqueue(apiUrl);
    if (!response.ok) {
      if (listings.length === 0) throw new Error(`Tapas episode API returned ${response.status}`);
      break;
    }
    const data = (await response.json()) as TapasEpisodesResponse;
    const episodes = parseEpisodesResponse(data);
    if (episodes.length === 0) break;

    for (const ep of episodes) {
      const path = ep.info?.uri ?? (ep.id ? `/episode/${ep.id}` : "");
      if (!path) continue;
      listings.push({
        title: ep.title ?? "Untitled",
        url: episodeUrl(path),
        date: parseDate(ep.publish_date ?? ep.date ?? ""),
      });
    }

    if (!data.data?.has_next) break;
    page++;
  }

  return listings;
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const match = SERIES_PATTERN.exec(url);
  if (!match) throw new Error(`Not a valid Tapas URL: ${url}`);
  const slug = match[1]!;
  const sourceUrl = seriesInfoUrl(slug);

  const doc = await fetchHtml(sourceUrl);

  // p.title holds the series title in static HTML; .header__title is a CSR placeholder
  const title = textContent(doc.querySelector("p.title")) || "Untitled";
  // Author link is inside .creator div
  const author = textContent(doc.querySelector(".creator a, a.creator__item")) || "Unknown";
  const summaryEl = doc.querySelector(".description__body, .js-series-description, .description--collapsible");
  const summary = summaryEl ? sanitizeHtml(summaryEl.innerHTML) : null;
  // Genre is a link whose href contains genre_name=
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
        ".viewer__row, .viewer-row, .content-viewer, .prose-content, .novel-body",
      );
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
