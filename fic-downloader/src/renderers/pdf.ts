import type { FicData } from "../shared/types.js";
import type { Settings, RendererFn } from "../shared/settings.js";
import { renderStoryInfoText } from "./story-info.js";
import { htmlToText } from "./utils.js";
import pdfMake from "pdfmake/build/pdfmake.js";
import type { TDocumentDefinitions, Content } from "pdfmake/interfaces.js";

const pdfMakeAny = pdfMake as Record<string, unknown>;

let fontsLoaded = false;

async function ensureFontsLoaded(): Promise<void> {
  if (fontsLoaded) return;
  const fontFiles: Record<string, string> = {
    "Roboto-Regular.ttf": browser.runtime.getURL("fonts/Roboto-Regular.ttf"),
    "Roboto-Medium.ttf": browser.runtime.getURL("fonts/Roboto-Medium.ttf"),
    "Roboto-Italic.ttf": browser.runtime.getURL("fonts/Roboto-Italic.ttf"),
    "Roboto-MediumItalic.ttf": browser.runtime.getURL("fonts/Roboto-MediumItalic.ttf"),
  };
  const vfs = pdfMakeAny.virtualfs as { writeFileSync: (name: string, data: Uint8Array) => void };
  for (const [filename, url] of Object.entries(fontFiles)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load PDF font: ${filename}`);
    const buffer = await response.arrayBuffer();
    vfs.writeFileSync(filename, new Uint8Array(buffer));
  }
  pdfMakeAny.fonts = {
    Roboto: {
      normal: "Roboto-Regular.ttf",
      bold: "Roboto-Medium.ttf",
      italics: "Roboto-Italic.ttf",
      bolditalics: "Roboto-MediumItalic.ttf",
    },
  };
  fontsLoaded = true;
}

type ContentPart = Content;

function htmlToPdfContent(html: string): ContentPart[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return nodesToPdfContent(Array.from(doc.body.childNodes));
}

function nodesToPdfContent(nodes: Node[]): ContentPart[] {
  const parts: ContentPart[] = [];
  for (const node of nodes) {
    const part = nodeToPdfContent(node);
    if (part !== null) parts.push(part);
  }
  return parts;
}

function nodeText(node: Node): string {
  return node.textContent?.trim() ?? "";
}

function nodeToPdfContent(node: Node): ContentPart | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text.trim() ? { text } : null;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const innerText = nodeText(element);

  switch (tag) {
    case "p":
      return { text: innerText, margin: [0, 4, 0, 4] };
    case "h1":
      return { text: innerText, fontSize: 18, bold: true, margin: [0, 12, 0, 6] };
    case "h2":
      return { text: innerText, fontSize: 15, bold: true, margin: [0, 10, 0, 4] };
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return { text: innerText, fontSize: 12, bold: true, margin: [0, 8, 0, 3] };
    case "blockquote":
      return {
        text: innerText,
        margin: [20, 4, 0, 4],
        italics: true,
        color: "#555555",
      };
    case "hr":
      return { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }], margin: [0, 8, 0, 8] };
    case "br":
      return { text: "\n" };
    case "ul":
      return {
        ul: Array.from(element.children).map((child) => nodeText(child)),
        margin: [0, 4, 0, 4],
      };
    case "ol":
      return {
        ol: Array.from(element.children).map((child) => nodeText(child)),
        margin: [0, 4, 0, 4],
      };
    default:
      return innerText ? { text: innerText } : null;
  }
}

function buildChapterContent(
  data: FicData,
  chapterIndex: number,
  settings: Settings,
): ContentPart[] {
  const chapter = data.core.chapters[chapterIndex];
  if (!chapter) throw new Error(`Chapter ${chapterIndex} not found`);

  const parts: ContentPart[] = [];

  if (settings.includeChapterTitles && chapter.title) {
    parts.push({
      text: `Chapter ${chapter.index + 1}: ${chapter.title}`,
      fontSize: 14,
      bold: true,
      margin: [0, 16, 0, 8],
    });
  }

  parts.push(...htmlToPdfContent(chapter.htmlContent));
  return parts;
}

async function renderSinglePdf(data: FicData, settings: Settings): Promise<Blob> {
  await ensureFontsLoaded();
  const content: ContentPart[] = [];

  if (settings.includeCoverPage) {
    const infoText = renderStoryInfoText(data, settings);
    content.push(
      { text: data.core.title, fontSize: 24, bold: true, alignment: "center", margin: [0, 60, 0, 8] },
      { text: `by ${data.core.author}`, fontSize: 14, alignment: "center", margin: [0, 0, 0, 40], color: "#555555" },
      { text: infoText, fontSize: 10, color: "#444444" },
      { text: "", pageBreak: "after" },
    );
  }

  if (settings.includeToc) {
    content.push({ text: "Table of Contents", fontSize: 18, bold: true, margin: [0, 0, 0, 12] });
    for (const chapter of data.core.chapters) {
      const title = chapter.title ?? `Chapter ${chapter.index + 1}`;
      content.push({ text: title, margin: [0, 2, 0, 2] });
    }
    content.push({ text: "", pageBreak: "after" });
  }

  for (let index = 0; index < data.core.chapters.length; index++) {
    if (index > 0) content.push({ text: "", pageBreak: "before" });
    content.push(...buildChapterContent(data, index, settings));
  }

  const docDefinition: TDocumentDefinitions = {
    content,
    defaultStyle: { font: "Roboto", fontSize: 11, lineHeight: 1.4 },
    info: { title: data.core.title, author: data.core.author },
  };

  return new Promise((resolve, reject) => {
    try {
      const pdf = pdfMake.createPdf(docDefinition);
      (pdf.getBlob as (cb: (blob: Blob) => void) => void)((blob) => {
        try {
          resolve(blob);
        } catch (error) {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export const renderPdf: RendererFn = async (data, settings) => {
  if (settings.chapterSplit) {
    const { zipFiles } = await import("./utils.js");
    const files: Record<string, Uint8Array> = {};

    for (let index = 0; index < data.core.chapters.length; index++) {
      const paddedIndex = String(index + 1).padStart(3, "0");
      const chapterBlob = await renderSinglePdf(
        { ...data, core: { ...data.core, chapters: [data.core.chapters[index]!] } },
        { ...settings, includeCoverPage: false, includeToc: false },
      );
      files[`${paddedIndex}-chapter.pdf`] = new Uint8Array(await chapterBlob.arrayBuffer());
    }
    return zipFiles(files);
  }

  return renderSinglePdf(data, settings);
};

export { htmlToText };
