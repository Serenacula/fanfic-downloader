import type { FicData, FicCore, FicChapter } from "../shared/types.js";
import type {
  SpaceBattlesMetadata,
  SufficientVelocityMetadata,
  QuestionableQuestingMetadata,
} from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import {
  fetchHtml,
  ogImage,
  sanitizeHtml,
  resolveImageSrcs,
  textContent,
  parseDate,
  collectImageUrls,
  fetchImages,
  type Parser,
} from "./common.js";

type XenForoSite = "spacebattles" | "sufficientvelocity" | "questionablequesting";

const THREAD_ID_PATTERN = /\/threads\/[^./]+\.(\d+)/;

function threadmarksUrl(baseUrl: string, threadId: string): string {
  return `${baseUrl}/threads/${threadId}/threadmarks`;
}

interface ThreadmarkListing {
  title: string;
  url: string;
  date: Date | null;
}

function extractThreadmarks(doc: Document, baseUrl: string): ThreadmarkListing[] {
  // .structItem-title is a div; links are <a> inside it — not <a class="structItem-title">
  const links = Array.from(
    doc.querySelectorAll(
      ".structItemContainer .structItem-title a[href], .threadmarkList a[href], ol.block-body a",
    ),
  );
  return links.flatMap((link) => {
    const href = link.getAttribute("href") ?? "";
    if (!href) return [];
    const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
    const title = link.textContent?.trim() ?? "Untitled";
    const listItem = link.closest("li, .structItem");
    const timeEl = listItem?.querySelector("time");
    const date = timeEl ? parseDate(timeEl.getAttribute("datetime") ?? "") : null;
    return [{ title, url: fullUrl, date }];
  });
}

function extractSubForum(doc: Document): string | null {
  const breadcrumbs = Array.from(doc.querySelectorAll(".p-breadcrumbs a, nav.breadcrumb a"));
  if (breadcrumbs.length >= 2) {
    return breadcrumbs[breadcrumbs.length - 1]?.textContent?.trim() ?? null;
  }
  return null;
}

function createXenForoParser(
  site: XenForoSite,
  baseUrl: string,
  hostPattern: string,
): Parser {
  const pattern = new RegExp(hostPattern.replace(".", "\\.") + "\\/threads\\/[^/]+\\.\\d+");

  async function parse(url: string, settings: Settings): Promise<FicData> {
    const threadIdMatch = THREAD_ID_PATTERN.exec(url);
    if (!threadIdMatch) throw new Error(`Not a valid ${site} URL: ${url}`);
    const threadId = threadIdMatch[1]!;
    const sourceUrl = `${baseUrl}/threads/${threadId}/`;

    const [threadDoc, threadmarksDoc] = await Promise.all([
      fetchHtml(sourceUrl),
      fetchHtml(threadmarksUrl(baseUrl, threadId)),
    ]);

    const title = textContent(threadDoc.querySelector("h1.p-title-value, .threadTitle, h1")) || "Untitled";
    const author = textContent(
      threadDoc.querySelector(".message-userDetails .username, .threadStarterPost .username"),
    ) || "Unknown";

    // Use the first post as the summary/description
    const firstPost = threadDoc.querySelector(".message-body .bbWrapper, .messageContent");
    const summary = firstPost ? sanitizeHtml(firstPost.innerHTML) : null;

    const subForum = extractSubForum(threadmarksDoc);
    const listings = extractThreadmarks(threadmarksDoc, baseUrl);
    if (listings.length === 0) throw new Error(`No threadmarks found for ${url}`);

    const publishDate = listings[0]?.date ?? null;
    const updateDate = listings[listings.length - 1]?.date ?? null;

    const chapters: FicChapter[] = await Promise.all(
      listings.map(async (listing, index) => {
        const postDoc = await fetchHtml(listing.url);
        // XF2: article has data-content="post-XXXX" and id="js-post-XXXX";
        // the anchor id "post-XXXX" is on a <span> inside the article, not the article itself
        const anchor = new URL(listing.url).hash.replace("#", "");
        const postEl = anchor
          ? postDoc.querySelector(
              `[data-content="${anchor}"] .message-body .bbWrapper,` +
              `[data-content="${anchor}"] .messageContent,` +
              `#js-${anchor} .message-body .bbWrapper,` +
              `#js-${anchor} .messageContent`,
            )
          : postDoc.querySelector(".message-body .bbWrapper, .messageContent");
        const htmlContent = postEl ? resolveImageSrcs(sanitizeHtml(postEl.innerHTML), listing.url) : "";
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
      coverImageUrl: ogImage(threadDoc),
      tags: [],
      status: "unknown",
      wordCount: null,
      publishDate,
      updateDate,
      sourceUrl,
    };

    if (site === "spacebattles") {
      const meta: SpaceBattlesMetadata = { threadUrl: sourceUrl, subForum };
      return { site: "spacebattles", core, meta };
    }
    if (site === "sufficientvelocity") {
      const meta: SufficientVelocityMetadata = { threadUrl: sourceUrl, subForum };
      return { site: "sufficientvelocity", core, meta };
    }
    const meta: QuestionableQuestingMetadata = { threadUrl: sourceUrl, subForum };
    return { site: "questionablequesting", core, meta };
  }

  return { pattern, parse };
}

export const spaceBattlesParser = createXenForoParser(
  "spacebattles",
  "https://forums.spacebattles.com",
  "forums.spacebattles.com",
);

export const sufficientVelocityParser = createXenForoParser(
  "sufficientvelocity",
  "https://forums.sufficientvelocity.com",
  "forums.sufficientvelocity.com",
);

export const questionableQuestingParser = createXenForoParser(
  "questionablequesting",
  "https://forum.questionablequesting.com",
  "forum.questionablequesting.com",
);
