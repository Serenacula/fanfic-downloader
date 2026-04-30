import type { FicData, FicCore, WattpadMetadata, FicChapter } from "../shared/types.js";
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

const STORY_PATTERN = /wattpad\.com\/story\/(\d+)/;

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
  categories?: string[];
  tags?: string[];
  readCount?: number;
  voteCount?: number;
  completed?: boolean;
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

const CHAPTER_SELECTORS = [
  ".panel-reading",        // legacy reader
  ".story-part-content",   // newer reader
  "#story-part-text",
  ".prose-block",
  "article.story-part",
  "article",               // broad fallback
].join(", ");

async function parse(url: string, settings: Settings): Promise<FicData> {
  const match = STORY_PATTERN.exec(url);
  if (!match) throw new Error(`Not a valid Wattpad URL: ${url}`);
  const storyId = match[1]!;
  const sourceUrl = storyUrl(storyId);

  const [doc, apiData] = await Promise.all([
    fetchHtml(sourceUrl),
    fetchStoryApi(storyId),
  ]);

  const title = (apiData?.title
    ?? textContent(doc.querySelector("h1.title, .story-info__title"))) || "Untitled";
  const author = (apiData?.user?.name
    ?? textContent(doc.querySelector(".author-info__username, .story-info__author"))) || "Unknown";
  const summaryEl = doc.querySelector(".description-text, .story-description");
  const summary = apiData?.description
    ? sanitizeHtml(apiData.description)
    : summaryEl ? sanitizeHtml(summaryEl.innerHTML) : null;

  const tags = apiData?.tags
    ?? Array.from(doc.querySelectorAll(".tag-items a, .story-tags a"))
      .map((element) => element.textContent?.trim() ?? "")
      .filter(Boolean);

  const status = apiData?.completed === true ? "complete" as const
    : apiData?.completed === false ? "in-progress" as const
    : "unknown" as const;

  const genre = (apiData?.mainCategory
    ?? textContent(doc.querySelector(".story-categories a, .story-info__category"))) || null;

  let parts: PartListing[];
  if (apiData?.parts?.length) {
    parts = apiData.parts.map((part) => ({
      id: String(part.id ?? ""),
      title: part.title ?? "Untitled",
      url: part.url ?? "",
      date: parseDate(part.createDate ?? ""),
    }));
  } else {
    const links = Array.from(doc.querySelectorAll(".table-of-contents a, .story-parts a[href]"));
    parts = links.flatMap((link) => {
      const href = link.getAttribute("href") ?? "";
      const partMatch = /\/(\d+)/.exec(href);
      if (!partMatch) return [];
      return [{
        id: partMatch[1]!,
        title: link.textContent?.trim() ?? "Untitled",
        url: href.startsWith("http") ? href : `https://www.wattpad.com${href}`,
        date: null,
      }];
    });
  }

  if (parts.length === 0) throw new Error("No chapters found on Wattpad story page");

  const publishDate = parts[0]?.date ?? null;
  const updateDate = parts[parts.length - 1]?.date ?? null;

  const chapters: FicChapter[] = await Promise.all(
    parts.map(async (part, index) => {
      let htmlContent: string | null = null;

      if (part.id) {
        const apiText = await fetchChapterText(part.id);
        if (apiText) htmlContent = sanitizeHtml(apiText);
      }

      if (!htmlContent) {
        const chapterDoc = await fetchHtml(part.url);
        const content = chapterDoc.querySelector(CHAPTER_SELECTORS);
        htmlContent = content ? sanitizeHtml(content.innerHTML) : "";
      }

      return { index, title: part.title, htmlContent: resolveImageSrcs(htmlContent, part.url) };
    }),
  );

  let images: FicCore["images"] = [];
  if (settings.includeImages) {
    const imageUrls = chapters.flatMap((chapter) => collectImageUrls(chapter.htmlContent, sourceUrl));
    images = await fetchImages([...new Set(imageUrls)]);
  }

  const readsText = textContent(doc.querySelector(".reads-count, .story-stats__reads"));
  const votesText = textContent(doc.querySelector(".votes-count, .story-stats__votes"));

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

  const meta: WattpadMetadata = {
    genre,
    reads: apiData?.readCount ?? parseCount(readsText),
    votes: apiData?.voteCount ?? parseCount(votesText),
  };

  return { site: "wattpad", core, meta };
}

export const wattpadParser: Parser = {
  pattern: STORY_PATTERN,
  parse,
};
