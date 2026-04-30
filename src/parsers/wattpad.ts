import type { FicData, FicCore, WattpadMetadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import {
  fetchHtml,
  sanitizeHtml,
  resolveImageSrcs,
  textContent,
  parseDate,
  collectImageUrls,
  fetchImages,
  type Parser,
} from "./common.js";
import { enqueue } from "../background/request-queue.js";

const STORY_PATTERN = /wattpad\.com\/story\/(\d+)/;
const CHAPTER_URL_PATTERN = /wattpad\.com\/(\d+)-/;

function storyUrl(storyId: string): string {
  return `https://www.wattpad.com/story/${storyId}`;
}

interface PartListing {
  id: string;
  title: string;
  url: string;
  date: Date | null;
}

interface WattpadApiPart {
  id?: string | number;
  title?: string;
  url?: string;
  createDate?: string;
}

interface WattpadApiStory {
  parts?: WattpadApiPart[];
  title?: string;
  user?: { name?: string };
  description?: string;
  mainCategory?: string;
  tags?: string[];
  readCount?: number;
  voteCount?: number;
  completed?: boolean;
}

interface WattpadJsonLd {
  headline?: string;
  about?: string;
  author?: { name?: string };
  description?: string;
  image?: string;
  keywords?: string;
  datePublished?: string;
  dateModified?: string;
  interactionStatistic?: number;
}

const WATTPAD_PLATFORM_TAGS = new Set(["eBooks", "reading", "stories", "fiction"]);

function parseJsonLd(doc: Document): WattpadJsonLd | null {
  const script = doc.querySelector('script[type="application/ld+json"]');
  if (!script?.textContent) return null;
  try {
    return JSON.parse(script.textContent) as WattpadJsonLd;
  } catch {
    return null;
  }
}

async function fetchStoryApi(storyId: string): Promise<WattpadApiStory | null> {
  const apiUrl = `https://www.wattpad.com/api/v3/stories/${storyId}`
    + `?fields=id,title,user,description,completed,mainCategory,tags,readCount,voteCount`
    + `,parts(id,title,url,createDate)&_=${Date.now()}`;
  try {
    const response = await enqueue(apiUrl);
    if (!response.ok) return null;
    return (await response.json()) as WattpadApiStory;
  } catch {
    return null;
  }
}

async function fetchChapterText(partId: string): Promise<string | null> {
  const apiUrl = `https://www.wattpad.com/api/v3/story_parts/${partId}?fields=text&_=${Date.now()}`;
  try {
    const response = await enqueue(apiUrl);
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: string };
    return data.text || null;
  } catch {
    return null;
  }
}

async function resolveStoryId(url: string): Promise<string> {
  const storyMatch = STORY_PATTERN.exec(url);
  if (storyMatch) return storyMatch[1]!;

  const chapterMatch = CHAPTER_URL_PATTERN.exec(url);
  if (!chapterMatch) throw new Error(`Not a valid Wattpad URL: ${url}`);
  const partId = chapterMatch[1]!;

  // Ask the API which story this chapter belongs to
  const apiUrl = `https://www.wattpad.com/api/v3/story_parts/${partId}?fields=group(id)&_=${Date.now()}`;
  try {
    const response = await enqueue(apiUrl);
    if (response.ok) {
      const data = (await response.json()) as { group?: { id?: number | string } };
      if (data.group?.id) return String(data.group.id);
    }
  } catch {
    // fall through to HTML fallback
  }

  // HTML fallback: the chapter page always has a link back to the story
  const doc = await fetchHtml(url);
  const storyLink = doc.querySelector('a[href*="/story/"]') as HTMLAnchorElement | null;
  const storyLinkMatch = storyLink ? STORY_PATTERN.exec(storyLink.href) : null;
  if (storyLinkMatch) return storyLinkMatch[1]!;

  throw new Error(`Could not resolve story ID from chapter URL: ${url}`);
}

function extractChapterContent(doc: Document): string {
  // Chapter paragraphs have a stable data-p-id attribute unique to Wattpad
  const paragraphs = Array.from(doc.querySelectorAll("p[data-p-id]"));
  if (paragraphs.length > 0) {
    return paragraphs.map((p) => p.outerHTML).join("\n");
  }
  // Legacy fallback for older chapter page layouts
  const pre = doc.querySelector(".panel.panel-reading pre");
  return pre ? pre.innerHTML : "";
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const storyId = await resolveStoryId(url);
  const sourceUrl = storyUrl(storyId);

  const [doc, apiData] = await Promise.all([
    fetchHtml(sourceUrl),
    fetchStoryApi(storyId),
  ]);

  const jsonLd = parseJsonLd(doc);

  const title = (apiData?.title ?? jsonLd?.headline
    ?? textContent(doc.querySelector('h1[data-testid="title"]'))) || "Untitled";

  const author = (apiData?.user?.name ?? jsonLd?.author?.name
    ?? textContent(doc.querySelector('a[aria-label^="by "]'))) || "Unknown";

  const rawDescription = apiData?.description ?? jsonLd?.description ?? null;
  const summary = rawDescription ? sanitizeHtml(rawDescription) : null;

  const genre = apiData?.mainCategory ?? jsonLd?.about ?? null;

  // API tags are cleanest; fall back to JSON-LD keywords with platform noise removed
  const tags: string[] = apiData?.tags?.length
    ? apiData.tags
    : jsonLd?.keywords
      ? jsonLd.keywords.split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag && !WATTPAD_PLATFORM_TAGS.has(tag) && tag !== genre)
      : Array.from(doc.querySelectorAll('[data-testid="tags"] span'))
          .map((el) => el.textContent?.trim() ?? "")
          .filter(Boolean);

  const status = apiData?.completed === true ? "complete" as const
    : apiData?.completed === false ? "in-progress" as const
    : "unknown" as const;

  const coverImageUrl = jsonLd?.image
    ?? (doc.querySelector('img[data-testid="image"]') as HTMLImageElement | null)
        ?.getAttribute("src")
    ?? null;

  let parts: PartListing[];
  if (apiData?.parts?.length) {
    parts = apiData.parts.map((part) => ({
      id: String(part.id ?? ""),
      title: part.title ?? "Untitled",
      url: part.url ?? "",
      date: parseDate(part.createDate ?? ""),
    }));
  } else {
    // Wattpad parts are React-rendered and won't be in the initial HTML;
    // this fallback may only capture links visible in the summary view.
    const CHAPTER_HREF = /^https:\/\/www\.wattpad\.com\/(\d+)/;
    const seen = new Set<string>();
    parts = (Array.from(doc.querySelectorAll("a[href]")) as HTMLAnchorElement[])
      .flatMap((link) => {
        const partMatch = CHAPTER_HREF.exec(link.href);
        if (!partMatch || seen.has(partMatch[1]!)) return [];
        seen.add(partMatch[1]!);
        return [{
          id: partMatch[1]!,
          title: link.textContent?.trim() || "Untitled",
          url: link.href,
          date: null,
        }];
      });
  }

  if (parts.length === 0) throw new Error("No chapters found on Wattpad story page");

  // Story-level dates from JSON-LD are more accurate than deriving from part dates
  const publishDate = parseDate(jsonLd?.datePublished ?? "") || parts[0]?.date || null;
  const updateDate = parseDate(jsonLd?.dateModified ?? "") || parts[parts.length - 1]?.date || null;

  const chapters: FicChapter[] = await Promise.all(
    parts.map(async (part, index) => {
      let htmlContent: string | null = null;

      if (part.id) {
        const apiText = await fetchChapterText(part.id);
        if (apiText) htmlContent = sanitizeHtml(apiText);
      }

      if (!htmlContent && part.url) {
        const chapterDoc = await fetchHtml(part.url);
        const raw = extractChapterContent(chapterDoc);
        htmlContent = raw ? sanitizeHtml(raw) : "";
      }

      return {
        index,
        title: part.title,
        htmlContent: resolveImageSrcs(htmlContent ?? "", part.url || sourceUrl),
      };
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
    coverImageUrl,
    tags,
    status,
    wordCount: null,
    publishDate,
    updateDate,
    sourceUrl,
  };

  const meta: WattpadMetadata = {
    genre,
    reads: apiData?.readCount ?? jsonLd?.interactionStatistic ?? null,
    votes: apiData?.voteCount ?? null,
  };

  return { site: "wattpad", core, meta };
}

export const wattpadParser: Parser = {
  pattern: /wattpad\.com\/(?:story\/\d+|\d+-)/,
  parse,
};
