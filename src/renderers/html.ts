import type { FicData } from "../shared/types.js";
import type { Settings, RendererFn } from "../shared/settings.js";
import { renderStoryInfoHtml } from "./story-info.js";
import { zipFiles, fetchCoverImage } from "./utils.js";

function escHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const HTML_STYLE = `
  body { max-width: 700px; margin: 0 auto; padding: 2em; font-family: Georgia, serif; line-height: 1.6; }
  h1 { margin-bottom: 0.2em; }
  .author { color: #555; margin-top: 0; }
  .summary { border-left: 3px solid #ccc; padding-left: 1em; color: #444; }
  table.meta { border-collapse: collapse; margin: 1em 0; }
  table.meta th { text-align: left; padding: 0.2em 1em 0.2em 0; color: #666; font-weight: normal; }
  table.meta td { padding: 0.2em 0; }
  .tag { background: #f0e6ff; border-radius: 3px; padding: 0.1em 0.4em; margin: 0.1em; display: inline-block; font-size: 0.9em; }
  h2.chapter-title { border-bottom: 1px solid #eee; padding-bottom: 0.3em; }
  .chapter { margin: 2em 0; }
  blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 1em; color: #555; }
`.trim();

function htmlPage(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Sere&#x27;s Fic Downloader (https://github.com/Serenacula/fic-downloader)">
<title>${escHtml(title)}</title>
<style>${HTML_STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
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

function renderChapterSection(data: FicData, chapterIndex: number, settings: Settings, imageMap: Map<string, string>): string {
  const chapter = data.core.chapters[chapterIndex];
  if (!chapter) throw new Error(`Chapter ${chapterIndex} not found`);

  const titleHtml =
    settings.includeChapterTitles && chapter.title
      ? `<h2 class="chapter-title">Chapter ${chapter.index + 1}: ${escHtml(chapter.title)}</h2>\n`
      : "";

  const html = imageMap.size > 0 ? remapImageSrcs(chapter.htmlContent, imageMap) : chapter.htmlContent;
  return `<div class="chapter">\n${titleHtml}${html}\n</div>`;
}

export const renderHtml: RendererFn = async (data, settings) => {
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

  const coverHtml = coverPath
    ? `<div class="cover"><img src="${coverPath}" alt="Cover" style="max-width:100%;"/></div>`
    : "";
  const infoHtml = settings.includeCoverPage
    ? coverHtml + renderStoryInfoHtml(data, settings)
    : coverHtml;

  if (settings.chapterSplit) {
    if (infoHtml) {
      files["00-info.html"] = htmlPage(data.core.title, infoHtml);
    }

    for (let index = 0; index < data.core.chapters.length; index++) {
      const paddedIndex = String(index + 1).padStart(3, "0");
      const chapterTitle = data.core.chapters[index]?.title ?? `Chapter ${index + 1}`;
      files[`${paddedIndex}-${chapterTitle.replace(/[<>:"/\\|?*]/g, "_").slice(0, 40)}.html`] =
        htmlPage(chapterTitle, renderChapterSection(data, index, settings, imageMap));
    }
    return zipFiles(files);
  }

  const tocHtml =
    settings.includeToc
      ? `<nav class="toc"><h2>Contents</h2><ol>${data.core.chapters
          .map((chapter) => {
            const title = chapter.title ?? `Chapter ${chapter.index + 1}`;
            return `<li><a href="#chapter-${chapter.index}">${escHtml(title)}</a></li>`;
          })
          .join("\n")}</ol></nav>`
      : "";

  const chapterSections = data.core.chapters
    .map((chapter, index) => {
      const section = renderChapterSection(data, index, settings, imageMap);
      return `<section id="chapter-${chapter.index}">\n${section}\n</section>`;
    })
    .join("\n\n");

  const body = [infoHtml, tocHtml, chapterSections].filter(Boolean).join("\n\n");
  const html = htmlPage(data.core.title, body);

  files["story.html"] = html;

  if (Object.keys(files).length > 1) {
    return zipFiles(files);
  }
  return new Blob([html], { type: "text/html" });
};
