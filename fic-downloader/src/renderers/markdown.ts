import type { FicData } from "../shared/types.js";
import type { Settings, RendererFn } from "../shared/settings.js";
import { htmlToMarkdown, zipFiles } from "./utils.js";

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

function renderChapterMd(data: FicData, chapterIndex: number, settings: Settings): string {
  const chapter = data.core.chapters[chapterIndex];
  if (!chapter) throw new Error(`Chapter ${chapterIndex} not found`);

  const lines: string[] = [];
  if (settings.includeChapterTitles && chapter.title) {
    lines.push(`## Chapter ${chapter.index + 1}: ${chapter.title}\n`);
  }
  lines.push(htmlToMarkdown(chapter.htmlContent));
  return lines.join("\n");
}

export const renderMarkdown: RendererFn = async (data, settings) => {
  const frontmatter = settings.includeCoverPage ? buildFrontmatter(data) : "";

  if (settings.chapterSplit) {
    const files: Record<string, string> = {};

    for (let index = 0; index < data.core.chapters.length; index++) {
      const paddedIndex = String(index + 1).padStart(3, "0");
      const header = index === 0 && frontmatter ? frontmatter + "\n\n" : "";
      files[`${paddedIndex}-chapter.md`] = header + renderChapterMd(data, index, settings);
    }
    return zipFiles(files);
  }

  const parts: string[] = [];
  if (frontmatter) parts.push(frontmatter);
  if (settings.includeToc) {
    parts.push(`# Table of Contents\n`);
    for (const chapter of data.core.chapters) {
      const title = chapter.title ?? `Chapter ${chapter.index + 1}`;
      parts.push(`- ${title}`);
    }
    parts.push("");
  }

  for (let index = 0; index < data.core.chapters.length; index++) {
    parts.push(renderChapterMd(data, index, settings));
  }

  const text = parts.join("\n\n");
  return new Blob([text], { type: "text/plain" });
};
