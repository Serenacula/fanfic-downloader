import type { FicData, FicCore, FFNMetadata, FicChapter } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import type { FicStatus } from "../shared/types.js";
import {
  fetchHtml,
  ogImage,
  fetchImages,
  sanitizeHtml,
  resolveImageSrcs,
  parseCount,
  collectImageUrls,
  type Parser,
  type OnProgress,
} from "./common.js";

const FFN_PATTERN = /fanfiction\.net\/s\/(\d+)/;
const FP_PATTERN = /fictionpress\.com\/s\/(\d+)/;

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

function chapterUrl(domain: string, storyId: string, chapter: number): string {
  return `https://www.${domain}/s/${storyId}/${chapter}/`;
}

function extractStoryId(pattern: RegExp, url: string): string | null {
  return pattern.exec(url)?.[1] ?? null;
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

function escapeHtmlText(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseMetaBar(doc: Document): StoryMeta {
  const title = doc.querySelector("#profile_top b.xcontrast_txt")?.textContent?.trim() ?? "";
  const author =
    doc.querySelector("#profile_top a.xcontrast_txt")?.textContent?.trim() ?? "Unknown";
  const summaryEl = doc.querySelector("#profile_top div.xcontrast_txt");
  // textContent is decoded text — escape it before wrapping, or literal <b> / & in
  // a summary would be re-parsed as markup and mangled
  const summary = summaryEl ? sanitizeHtml(`<p>${escapeHtmlText(summaryEl.textContent?.trim() ?? "")}</p>`) : null;

  const metaSpan = doc.querySelector("#profile_top span.xgray.xcontrast_txt");
  const metaText = metaSpan?.textContent ?? "";

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

  // Parse dates from span elements within the meta.
  // data-xutime is a Unix timestamp in seconds on the live site; test fixtures may use ISO strings.
  const dateSpans = metaSpan ? Array.from(metaSpan.querySelectorAll("span[data-xutime]")) : [];
  const toDate = (span: Element): Date | null => {
    const raw = span.getAttribute("data-xutime") ?? "";
    const trimmed = raw.trim();
    if (/^\d+$/.test(trimmed) && trimmed !== "0") {
      return new Date(Number(trimmed) * 1000);
    }
    // Fall back to ISO / free-form date string (e.g. test fixtures)
    const date = new Date(trimmed);
    return isNaN(date.getTime()) ? null : date;
  };
  for (const span of dateSpans) {
    // Find the nearest preceding label ("Published:" / "Updated:"), skipping
    // whitespace-only nodes and reading labels wrapped in elements. Stop at the
    // previous date span so its label is never reused for this one.
    let sibling: Node | null = span.previousSibling;
    let labelText = "";
    while (sibling) {
      if (
        sibling.nodeType === Node.ELEMENT_NODE &&
        (sibling as Element).hasAttribute("data-xutime")
      ) {
        break;
      }
      const text = (sibling.textContent ?? "").trim();
      if (text) {
        labelText = text;
        break;
      }
      sibling = sibling.previousSibling;
    }
    const date = toDate(span);
    if (/published/i.test(labelText)) {
      publishDate = date;
    } else if (/updated/i.test(labelText)) {
      updateDate = date;
    }
  }
  if (publishDate && !updateDate) updateDate = publishDate;

  // Universe from breadcrumb
  const breadcrumbAnchors = Array.from(
    doc.querySelectorAll("#pre_story_links a[href^='/']"),
  );
  const crossoverAnchor = breadcrumbAnchors.find((anchor) =>
    (anchor.getAttribute("href") ?? "").includes("/crossovers/"),
  );
  const universe =
    (crossoverAnchor ?? breadcrumbAnchors[breadcrumbAnchors.length - 1])
      ?.textContent?.trim() ?? null;

  return {
    title: title || "Untitled",
    author,
    summary,
    genres,
    characters,
    universe,
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

async function parseStory(
  domain: string,
  site: "ffn" | "fictionpress",
  storyId: string,
  settings: Settings,
  onProgress?: OnProgress,
): Promise<FicData> {
  const firstDoc = await fetchHtml(chapterUrl(domain, storyId, 1));
  const meta = parseMetaBar(firstDoc);

  let fetchedCount = 1;
  onProgress?.(fetchedCount, meta.chapterCount);
  const chapterDocs: Document[] = [firstDoc];
  if (meta.chapterCount > 1) {
    const remainingDocs = await Promise.all(
      Array.from({ length: meta.chapterCount - 1 }, (_, index) =>
        fetchHtml(chapterUrl(domain, storyId, index + 2)).then((doc) => {
          onProgress?.(++fetchedCount, meta.chapterCount);
          return doc;
        }),
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
    const chUrl = chapterUrl(domain, storyId, index + 1);
    const htmlContent = content ? resolveImageSrcs(sanitizeHtml(content.innerHTML), chUrl) : "";
    const title = chapterTitles[index] ?? null;
    return { index, title, htmlContent };
  });

  const sourceUrl = `https://www.${domain}/s/${storyId}/`;

  let images: FicCore["images"] = [];
  if (settings.includeImages) {
    const imageUrls = [
      ...(meta.summary ? collectImageUrls(meta.summary, sourceUrl) : []),
      ...chapters.flatMap((chapter) => collectImageUrls(chapter.htmlContent, sourceUrl)),
    ];
    images = await fetchImages([...new Set(imageUrls)]);
  }

  const core: FicCore = {
    title: meta.title,
    author: meta.author,
    summary: meta.summary,
    chapters,
    images,
    coverImageUrl: ogImage(firstDoc),
    tags: [...meta.genres, ...meta.characters],
    status: meta.status,
    wordCount: meta.wordCount,
    publishDate: meta.publishDate,
    updateDate: meta.updateDate,
    sourceUrl,
  };

  const siteMeta: FFNMetadata = {
    genres: meta.genres,
    universe: meta.universe,
    follows: meta.follows,
    favs: meta.favs,
    rating: meta.rating,
    language: meta.language,
  };

  return { site, core, meta: siteMeta };
}

export const ffnParser: Parser = {
  pattern: FFN_PATTERN,
  async parse(url: string, settings: Settings, onProgress?: OnProgress): Promise<FicData> {
    const storyId = extractStoryId(FFN_PATTERN, url);
    if (!storyId) throw new Error(`Not a valid FFN URL: ${url}`);
    return parseStory("fanfiction.net", "ffn", storyId, settings, onProgress);
  },
};

export const fictionPressParser: Parser = {
  pattern: FP_PATTERN,
  async parse(url: string, settings: Settings, onProgress?: OnProgress): Promise<FicData> {
    const storyId = extractStoryId(FP_PATTERN, url);
    if (!storyId) throw new Error(`Not a valid FictionPress URL: ${url}`);
    return parseStory("fictionpress.com", "fictionpress", storyId, settings, onProgress);
  },
};
