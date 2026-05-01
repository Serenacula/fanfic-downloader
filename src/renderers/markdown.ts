import type { FicData } from "../shared/types.js";
import type { Settings, RendererFn } from "../shared/settings.js";
import { htmlToMarkdown, zipFiles, fetchCoverImage } from "./utils.js";

function buildFrontmatter(data: FicData): string {
  const { core } = data;
  const lines = [
    "---",
    `title: "${core.title.replace(/"/g, '\\"')}"`,
    `author: "${core.author.replace(/"/g, '\\"')}"`,
    `source: "${core.sourceUrl}"`,
  ];
  if (core.publishDate) lines.push(`published: "${core.publishDate.toISOString().slice(0, 10)}"`);
  if (core.updateDate) lines.push(`updated: "${core.updateDate.toISOString().slice(0, 10)}"`);
  if (core.status !== "unknown") lines.push(`status: "${core.status}"`);
  if (core.wordCount) lines.push(`words: ${core.wordCount}`);

  if (data.site === "ao3" && data.meta.fandoms.length > 0) {
    lines.push(`fandoms:`);
    for (const fandom of data.meta.fandoms) {
      lines.push(`  - "${fandom.replace(/"/g, '\\"')}"`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

function buildImageMap(data: FicData): Map<string, string> {
  const imageMap = new Map<string, string>();
  for (const [index, image] of data.core.images.entries()) {
    const rawExt = image.mimeType === "image/jpeg" ? "jpg" : (image.mimeType.split("/")[1] ?? "");
    const extension = rawExt.replace(/\+.*$/, "").replace(/[^a-zA-Z0-9]/g, "") || "jpg";
    imageMap.set(image.url, `images/img-${index}.${extension}`);
  }
  return imageMap;
}

function remapImageSrcs(html: string, imageMap: Map<string, string>): string {
  for (const [originalUrl, localPath] of imageMap) {
    html = html.split(originalUrl).join(localPath);
  }
  return html;
}

function renderChapterMd(data: FicData, chapterIndex: number, settings: Settings, imageMap: Map<string, string>): string {
  const chapter = data.core.chapters[chapterIndex];
  if (!chapter) throw new Error(`Chapter ${chapterIndex} not found`);

  const lines: string[] = [];
  if (settings.includeChapterTitles && chapter.title) {
    lines.push(`## Chapter ${chapter.index + 1}: ${chapter.title}\n`);
  }
  const html = imageMap.size > 0 ? remapImageSrcs(chapter.htmlContent, imageMap) : chapter.htmlContent;
  lines.push(htmlToMarkdown(html));
  return lines.join("\n");
}

export const renderMarkdown: RendererFn = async (data, settings) => {
  const frontmatter = settings.includeCoverPage ? buildFrontmatter(data) : "";
  const imageMap = buildImageMap(data);

  const files: Record<string, Uint8Array | string> = {};

  // Embed downloaded chapter images
  for (const [url, localPath] of imageMap) {
    const image = data.core.images.find((img) => img.url === url);
    if (image) files[localPath] = new Uint8Array(image.data);
  }

  // Fetch and embed cover image
  const cover = settings.includeCoverImage ? await fetchCoverImage(data.core.coverImageUrl) : null;
  const coverPath = cover ? `images/cover.${cover.extension}` : null;
  if (cover && coverPath) files[coverPath] = cover.data;

  const titleBlock = [
    ...(coverPath ? [`![Cover](${coverPath})`] : []),
    `# ${data.core.title}`,
    `*by ${data.core.author}*`,
  ].join("\n\n");

  if (settings.chapterSplit) {
    for (let index = 0; index < data.core.chapters.length; index++) {
      const paddedIndex = String(index + 1).padStart(3, "0");
      const header = index === 0
        ? [frontmatter, titleBlock].filter(Boolean).join("\n\n") + "\n\n"
        : "";
      files[`${paddedIndex}-chapter.md`] = header + renderChapterMd(data, index, settings, imageMap);
    }
    return zipFiles(files);
  }

  const parts: string[] = [];
  if (frontmatter) parts.push(frontmatter);
  parts.push(titleBlock);
  if (settings.includeToc) {
    parts.push(`## Table of Contents\n`);
    for (const chapter of data.core.chapters) {
      const title = chapter.title ?? `Chapter ${chapter.index + 1}`;
      parts.push(`- ${title}`);
    }
    parts.push("");
  }

  for (let index = 0; index < data.core.chapters.length; index++) {
    parts.push(renderChapterMd(data, index, settings, imageMap));
  }

  const text = parts.join("\n\n");
  files["story.md"] = text;

  if (Object.keys(files).length > 1) {
    return zipFiles(files);
  }
  return new Blob([text], { type: "text/plain" });
};
