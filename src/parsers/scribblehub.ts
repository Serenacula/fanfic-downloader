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

interface SeriesRef {
  id: string;
  seriesPageUrl: string;
}

interface ProxyResponse {
  ok: boolean;
  status: number;
  text: string;
}

// Cloudflare blocks direct service-worker fetches with a JS challenge (403 cf-mitigated).
// Route through an active ScribbleHub tab so the request is same-origin and uses the
// browser's existing Cloudflare clearance. Falls back to direct fetch in tests and when
// no ScribbleHub tab is open.
async function scribbleHubFetchHtml(url: string): Promise<Document> {
  try {
    if (typeof browser !== "undefined" && browser?.tabs) {
      const tabs = await browser.tabs.query({ url: "*://*.scribblehub.com/*" });
      const tabId = tabs.find((t) => t.id != null && !t.discarded)?.id;
      if (tabId != null) {
        const resp = await browser.tabs.sendMessage(tabId, { type: "proxyFetch", url }) as ProxyResponse;
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        return new DOMParser().parseFromString(resp.text, "text/html");
      }
    }
  } catch (error) {
    console.warn(`[scribblehub] tab proxy unavailable for ${url}:`, error);
  }
  return fetchHtml(url);
}

function resolveSeriesRef(url: string): SeriesRef | null {
  // Series page: use URL as-is — it already contains the title slug ScribbleHub requires
  const seriesMatch = /scribblehub\.com(\/series\/(\d+)(?:\/[^/?#]*)?\/)/.exec(url);
  if (seriesMatch) {
    return { id: seriesMatch[2]!, seriesPageUrl: `https://www.scribblehub.com${seriesMatch[1]}` };
  }
  // Chapter URL: extract both ID and title slug to construct the full series URL
  const chapterMatch = /scribblehub\.com\/read\/(\d+)-([^/]+)\//.exec(url);
  if (chapterMatch) {
    return {
      id: chapterMatch[1]!,
      seriesPageUrl: `https://www.scribblehub.com/series/${chapterMatch[1]}/${chapterMatch[2]}/`,
    };
  }
  return null;
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
    console.log(`[scribblehub] fetching AJAX chapter list for series ${seriesId}`);
    // ScribbleHub loads its TOC via WordPress AJAX
    const response = await enqueue("https://www.scribblehub.com/wp-admin/admin-ajax.php", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `action=wi_getreleases_long&pagenum=1&mypostid=${seriesId}`,
    });
    console.log(`[scribblehub] AJAX response status: ${response.status}`);
    if (response.ok) {
      const html = await response.text();
      const tocDoc = new DOMParser().parseFromString(html, "text/html");
      const listings = parseListingsFromDoc(tocDoc);
      console.log(`[scribblehub] AJAX returned ${listings.length} chapters`);
      if (listings.length > 0) return listings;
    }
  } catch (error) {
    console.warn(`[scribblehub] AJAX chapter list failed:`, error);
  }
  // Fall back to TOC items embedded in the series page itself
  const fallbackListings = parseListingsFromDoc(seriesDoc);
  console.log(`[scribblehub] static HTML fallback: ${fallbackListings.length} chapters`);
  return fallbackListings;
}

async function fetchWordCount(canonicalUrl: string): Promise<number | null> {
  if (!canonicalUrl) return null;
  const statsUrl = canonicalUrl.endsWith("/") ? `${canonicalUrl}stats/` : `${canonicalUrl}/stats/`;
  console.log(`[scribblehub] fetching word count from ${statsUrl}`);
  try {
    const doc = await scribbleHubFetchHtml(statsUrl);
    const count = tableStatValue(doc, "Word Count:");
    console.log(`[scribblehub] word count: ${count}`);
    return count;
  } catch (error) {
    console.warn(`[scribblehub] word count fetch failed:`, error);
    return null;
  }
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const ref = resolveSeriesRef(url);
  if (!ref) throw new Error(`Not a valid ScribbleHub URL: ${url}`);
  const { id: seriesId, seriesPageUrl: sourceUrl } = ref;
  console.log(`[scribblehub] parsing ${url}, seriesId=${seriesId}, sourceUrl=${sourceUrl}`);

  const doc = await scribbleHubFetchHtml(sourceUrl);
  console.log(`[scribblehub] series page fetched, title element: "${doc.querySelector(".fic_title")?.textContent?.trim()}"`);

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

  console.log(`[scribblehub] fetching ${listings.length} chapters`);
  const chapters: FicChapter[] = await Promise.all(
    listings.reverse().map(async (listing, index) => {
      console.log(`[scribblehub] fetching chapter ${index}: ${listing.url}`);
      const chapterDoc = await scribbleHubFetchHtml(listing.url);
      const content = chapterDoc.querySelector("#chp_raw, .chp_raw");
      console.log(`[scribblehub] chapter ${index} content found: ${!!content}`);
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
