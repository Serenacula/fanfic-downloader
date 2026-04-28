import type { FicData } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import type { RendererFn } from "../shared/settings.js";
import { renderStoryInfoText } from "./story-info.js";
import { htmlToText, zipFiles } from "./utils.js";

function renderChapterText(data: FicData, chapterIndex: number, settings: Settings): string {
  const chapter = data.core.chapters[chapterIndex];
  if (!chapter) throw new Error(`Chapter ${chapterIndex} not found`);

  const lines: string[] = [];

  if (settings.includeChapterTitles && chapter.title) {
    lines.push(`Chapter ${chapter.index + 1}: ${chapter.title}`);
    lines.push("=".repeat(40));
    lines.push("");
  }

  lines.push(htmlToText(chapter.htmlContent));
  return lines.join("\n");
}

export const renderTxt: RendererFn = async (data, settings) => {
  const header = settings.includeCoverPage ? renderStoryInfoText(data, settings) : "";

  if (settings.chapterSplit) {
    const files: Record<string, string> = {};
    if (header) files["00-info.txt"] = header;

    for (let index = 0; index < data.core.chapters.length; index++) {
      const paddedIndex = String(index + 1).padStart(3, "0");
      files[`${paddedIndex}-chapter.txt`] = renderChapterText(data, index, settings);
    }
    return zipFiles(files);
  }

  const parts: string[] = [];
  if (header) parts.push(header);

  for (let index = 0; index < data.core.chapters.length; index++) {
    parts.push(renderChapterText(data, index, settings));
  }

  const text = parts.join("\n\n" + "─".repeat(40) + "\n\n");
  return new Blob([text], { type: "text/plain" });
};
