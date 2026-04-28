import type { FicData } from "../shared/types.js";
import type { Settings, RendererFn } from "../shared/settings.js";
import { renderStoryInfoHtml } from "./story-info.js";
import { zipFiles } from "./utils.js";

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
<title>${title.replace(/</g, "&lt;")}</title>
<style>${HTML_STYLE}</style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderChapterSection(data: FicData, chapterIndex: number, settings: Settings): string {
  const chapter = data.core.chapters[chapterIndex];
  if (!chapter) throw new Error(`Chapter ${chapterIndex} not found`);

  const titleHtml =
    settings.includeChapterTitles && chapter.title
      ? `<h2 class="chapter-title">Chapter ${chapter.index + 1}: ${chapter.title}</h2>\n`
      : "";

  return `<div class="chapter">\n${titleHtml}${chapter.htmlContent}\n</div>`;
}

export const renderHtml: RendererFn = async (data, settings) => {
  const infoHtml = settings.includeCoverPage ? renderStoryInfoHtml(data, settings) : "";

  if (settings.chapterSplit) {
    const files: Record<string, string> = {};
    if (infoHtml) {
      files["00-info.html"] = htmlPage(data.core.title, infoHtml);
    }

    for (let index = 0; index < data.core.chapters.length; index++) {
      const paddedIndex = String(index + 1).padStart(3, "0");
      const chapterTitle = data.core.chapters[index]?.title ?? `Chapter ${index + 1}`;
      files[`${paddedIndex}-${chapterTitle.replace(/[<>:"/\\|?*]/g, "_").slice(0, 40)}.html`] =
        htmlPage(chapterTitle, renderChapterSection(data, index, settings));
    }
    return zipFiles(files);
  }

  const tocHtml =
    settings.includeToc
      ? `<nav class="toc"><h2>Contents</h2><ol>${data.core.chapters
          .map((chapter) => {
            const title = chapter.title ?? `Chapter ${chapter.index + 1}`;
            return `<li><a href="#chapter-${chapter.index}">${title}</a></li>`;
          })
          .join("\n")}</ol></nav>`
      : "";

  const chapterSections = data.core.chapters
    .map((chapter, index) => {
      const section = renderChapterSection(data, index, settings);
      return `<section id="chapter-${chapter.index}">\n${section}\n</section>`;
    })
    .join("\n\n");

  const body = [infoHtml, tocHtml, chapterSections].filter(Boolean).join("\n\n");
  return new Blob([htmlPage(data.core.title, body)], { type: "text/html" });
};
