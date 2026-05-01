import type { FicData } from "../shared/types.js";
import type { Settings, RendererFn } from "../shared/settings.js";
import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  convertInchesToTwip,
  Packer,
} from "docx";
import { renderStoryInfoText } from "./story-info.js";
import { htmlToText } from "./utils.js";

function htmlToParagraphs(html: string): Paragraph[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const paragraphs: Paragraph[] = [];

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? "";
      if (text) paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
      continue;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) continue;

    const element = node as Element;
    const tag = element.tagName.toLowerCase();
    const text = element.textContent?.trim() ?? "";

    switch (tag) {
      case "p":
        paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
        break;
      case "h1":
        paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_1 }));
        break;
      case "h2":
        paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_2 }));
        break;
      case "h3":
        paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_3 }));
        break;
      case "h4":
      case "h5":
      case "h6":
        paragraphs.push(new Paragraph({ text, heading: HeadingLevel.HEADING_4 }));
        break;
      case "blockquote":
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text, italics: true, color: "555555" })],
            indent: { left: convertInchesToTwip(0.5) },
          }),
        );
        break;
      case "hr":
        paragraphs.push(
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" } },
          }),
        );
        break;
      case "br":
        paragraphs.push(new Paragraph({ text: "" }));
        break;
      default:
        if (text) paragraphs.push(new Paragraph({ children: [new TextRun(text)] }));
    }
  }

  return paragraphs;
}

function buildChapterParagraphs(
  data: FicData,
  chapterIndex: number,
  settings: Settings,
): Paragraph[] {
  const chapter = data.core.chapters[chapterIndex];
  if (!chapter) throw new Error(`Chapter ${chapterIndex} not found`);

  const paragraphs: Paragraph[] = [];

  if (settings.includeChapterTitles && chapter.title) {
    paragraphs.push(
      new Paragraph({
        text: `Chapter ${chapter.index + 1}: ${chapter.title}`,
        heading: HeadingLevel.HEADING_2,
      }),
    );
  }

  paragraphs.push(...htmlToParagraphs(chapter.htmlContent));
  return paragraphs;
}

async function renderSingleDocx(data: FicData, settings: Settings): Promise<Blob> {
  const allParagraphs: Paragraph[] = [];

  if (settings.includeCoverPage) {
    const infoText = renderStoryInfoText(data, settings);
    allParagraphs.push(
      new Paragraph({
        text: data.core.title,
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({
        children: [new TextRun({ text: `by ${data.core.author}`, color: "555555" })],
        alignment: AlignmentType.CENTER,
      }),
      new Paragraph({ text: "" }),
      ...infoText
        .split("\n")
        .map(
          (line) =>
            new Paragraph({
              children: [new TextRun({ text: line, size: 20 })],
            }),
        ),
      new Paragraph({ text: "", pageBreakBefore: true }),
    );
  }

  if (settings.includeToc) {
    allParagraphs.push(new Paragraph({ text: "Table of Contents", heading: HeadingLevel.HEADING_1 }));
    for (const chapter of data.core.chapters) {
      const title = chapter.title ?? `Chapter ${chapter.index + 1}`;
      allParagraphs.push(new Paragraph({ text: title }));
    }
    allParagraphs.push(new Paragraph({ text: "", pageBreakBefore: true }));
  }

  for (let index = 0; index < data.core.chapters.length; index++) {
    if (index > 0) {
      allParagraphs.push(new Paragraph({ text: "", pageBreakBefore: true }));
    }
    allParagraphs.push(...buildChapterParagraphs(data, index, settings));
  }

  const doc = new Document({
    creator: data.core.author,
    title: data.core.title,
    sections: [{ properties: {}, children: allParagraphs }],
  });

  return Packer.toBlob(doc).then(
    (blob) =>
      new Blob([blob], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
  );
}

export const renderDocx: RendererFn = async (data, settings) => {
  if (settings.chapterSplit) {
    const { zipFiles } = await import("./utils.js");
    const files: Record<string, Uint8Array> = {};

    for (let index = 0; index < data.core.chapters.length; index++) {
      const paddedIndex = String(index + 1).padStart(3, "0");
      const chapterBlob = await renderSingleDocx(
        { ...data, core: { ...data.core, chapters: [data.core.chapters[index]!] } },
        { ...settings, includeCoverPage: false, includeToc: false },
      );
      files[`${paddedIndex}-chapter.docx`] = new Uint8Array(await chapterBlob.arrayBuffer());
    }
    return zipFiles(files);
  }

  return renderSingleDocx(data, settings);
};

export { htmlToText };
