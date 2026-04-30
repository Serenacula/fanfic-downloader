import type { FicData, FicCore, FFNMetadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import type { FicStatus } from "../shared/types.js";
import {
  fetchHtml,
  fetchImages,
  sanitizeHtml,
  parseCount,
  parseDate,
  collectImageUrls,
  type Parser,
} from "./common.js";

const STORY_ID_PATTERN = /fanfiction\.net\/s\/(\d+)/;

const FFN_GENRES = new Set([
  "Adventure", "Angst", "Crime", "Drama", "Fantasy", "Friendship", "General",
  "Horror", "Humor", "Hurt/Comfort", "Mystery", "Parody", "Poetry", "Romance",
  "Sci-Fi", "Spiritual", "Supernatural", "Suspense", "Tragedy", "Western",
]);

const FFN_LANGUAGES = new Set([
  "English", "French", "Spanish", "German", "Japanese", "Chinese", "Korean",
  "Italian", "Portuguese", "Russian", "Dutch", "Norwegian", "Swedish", "Danish",
  "Finnish", "Polish", "Indonesian", "Turkish", "Arabic", "Hebrew",
]);

function parseGenrePart(part: string): string[] | null {
  if (FFN_GENRES.has(part)) return [part];
  const subParts = part.split("/");
  if (subParts.every((subPart) => FFN_GENRES.has(subPart))) return subParts;
  // Handle compound genres like "Hurt/Comfort/Adventure" where "Hurt/Comfort" is one genre
  for (let splitAt = subParts.length - 1; splitAt >= 1; splitAt--) {
    const left = subParts.slice(0, splitAt).join("/");
    const right = subParts.slice(splitAt).join("/");
    if (FFN_GENRES.has(left)) {
      const rightParsed = parseGenrePart(right);
      if (rightParsed) return [left, ...rightParsed];
    }
  }
  return null;
}

function chapterUrl(storyId: string, chapter: number): string {
  return `https://www.fanfiction.net/s/${storyId}/${chapter}/`;
}

function extractStoryId(url: string): string | null {
  return STORY_ID_PATTERN.exec(url)?.[1] ?? null;
}

interface StoryMeta {
  title: string;
  author: string;
  summary: string | null;
  genres: string[];
  characters: string[];
  universe: string | null;
  wordCount: number | null;
  follows: number | null;
  favs: number | null;
  rating: string | null;
  language: string | null;
  status: FicStatus;
  publishDate: Date | null;
  updateDate: Date | null;
  chapterCount: number;
}

function parseMetaBar(doc: Document): StoryMeta {
  const title = doc.querySelector("#profile_top b.xcontrast_txt")?.textContent?.trim() ?? "";
  const author =
    doc.querySelector("#profile_top a.xcontrast_txt")?.textContent?.trim() ?? "Unknown";
  const summaryEl = doc.querySelector("#profile_top div.xcontrast_txt");
  const summary = summaryEl?.textContent?.trim() ?? null;

  const metaSpan = doc.querySelector("#profile_top span.xgray.xcontrast_txt");
  const metaText = metaSpan?.textContent ?? "";

  // Parse genre, characters from the meta bar text
  // Format: "Rated: T - English - Genre/Genre - Characters - Chapters: N - Words: N - ..."
  const parts = metaText.split(" - ").map((part) => part.trim());

  let rating: string | null = null;
  let language: string | null = null;
  const genres: string[] = [];
  const characters: string[] = [];
  let wordCount: number | null = null;
  let follows: number | null = null;
  let favs: number | null = null;
  let chapterCount = 1;
  let status: FicStatus = "unknown";
  let publishDate: Date | null = null;
  let updateDate: Date | null = null;

  for (const part of parts) {
    if (part.startsWith("Rated:")) {
      rating = part.replace("Rated:", "").trim();
    } else if (part.startsWith("Words:")) {
      wordCount = parseCount(part.replace("Words:", "").trim());
    } else if (part.startsWith("Chapters:")) {
      chapterCount = parseInt(part.replace("Chapters:", "").trim(), 10) || 1;
    } else if (part.startsWith("Favs:")) {
      favs = parseCount(part.replace("Favs:", "").trim());
    } else if (part.startsWith("Follows:")) {
      follows = parseCount(part.replace("Follows:", "").trim());
    } else if (part.startsWith("Reviews:") || part.startsWith("Updated:") || part.startsWith("Published:")) {
      // Dates are parsed from data-xutime span attributes below
    } else if (part.startsWith("Status:")) {
      const statusVal = part.replace("Status:", "").trim().toLowerCase();
      if (statusVal.includes("complet")) status = "complete";
      else if (statusVal.includes("progress")) status = "in-progress";
    } else if (part === "Complete") {
      status = "complete";
    } else if (part === "In-Progress") {
      status = "in-progress";
    } else if (part.length > 0) {
      const parsedGenres = parseGenrePart(part);
      if (parsedGenres) {
        genres.push(...parsedGenres);
      } else if (!language && FFN_LANGUAGES.has(part)) {
        language = part;
      } else if (!/^\d/.test(part)) {
        characters.push(...part.split(",").map((s) => s.trim()).filter(Boolean));
      }
    }
  }

  // Parse dates from span elements within the meta
  const dateSpans = metaSpan ? Array.from(metaSpan.querySelectorAll("span[data-xutime]")) : [];
  if (dateSpans[0]) publishDate = parseDate(dateSpans[0].getAttribute("data-xutime") ?? "");
  if (dateSpans[1]) updateDate = parseDate(dateSpans[1].getAttribute("data-xutime") ?? "");
  if (publishDate && !updateDate) updateDate = publishDate;

  // Universe from breadcrumb
  const universeLink = doc.querySelector("#pre_story_links a[href*='/crossovers/'], #pre_story_links a:not([href*='/'])")?.textContent?.trim() ?? null;

  return {
    title: title || "Untitled",
    author,
    summary,
    genres,
    characters,
    universe: universeLink,
    wordCount,
    follows,
    favs,
    rating,
    language,
    status,
    publishDate,
    updateDate,
    chapterCount,
  };
}

async function parse(url: string, settings: Settings): Promise<FicData> {
  const storyId = extractStoryId(url);
  if (!storyId) throw new Error(`Not a valid FFN URL: ${url}`);

  const firstDoc = await fetchHtml(chapterUrl(storyId, 1));
  const meta = parseMetaBar(firstDoc);

  const chapterDocs: Document[] = [firstDoc];
  if (meta.chapterCount > 1) {
    const remainingDocs = await Promise.all(
      Array.from({ length: meta.chapterCount - 1 }, (_, index) =>
        fetchHtml(chapterUrl(storyId, index + 2)),
      ),
    );
    chapterDocs.push(...remainingDocs);
  }

  // Extract chapter titles from the select dropdown on the first doc
  const chapterOptions = Array.from(firstDoc.querySelectorAll("select#chap_select option"));
  const chapterTitles: Array<string | null> = chapterOptions.map(
    (option) => option.textContent?.replace(/^\d+\.\s*/, "").trim() ?? null,
  );

  const chapters: FicChapter[] = chapterDocs.map((chapterDoc, index) => {
    const content = chapterDoc.querySelector("#storytext");
    const htmlContent = content ? sanitizeHtml(content.innerHTML) : "";
    const title = chapterTitles[index] ?? null;
    return { index, title, htmlContent };
  });

  let images: FicCore["images"] = [];
  if (settings.includeImages) {
    const sourceUrl = chapterUrl(storyId, 1);
    const imageUrls = chapters.flatMap((chapter) =>
      collectImageUrls(chapter.htmlContent, sourceUrl),
    );
    images = await fetchImages([...new Set(imageUrls)]);
  }

  const core: FicCore = {
    title: meta.title,
    author: meta.author,
    summary: meta.summary,
    chapters,
    images,
    tags: [...meta.genres, ...meta.characters],
    status: meta.status,
    wordCount: meta.wordCount,
    publishDate: meta.publishDate,
    updateDate: meta.updateDate,
    sourceUrl: `https://www.fanfiction.net/s/${storyId}/`,
  };

  const ffnMeta: FFNMetadata = {
    genres: meta.genres,
    universe: meta.universe,
    follows: meta.follows,
    favs: meta.favs,
    rating: meta.rating,
    language: meta.language,
  };

  return { site: "ffn", core, meta: ffnMeta };
}

export const ffnParser: Parser = {
  pattern: STORY_ID_PATTERN,
  parse,
};
