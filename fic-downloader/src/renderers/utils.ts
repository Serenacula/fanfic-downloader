import type { FicData } from "../shared/types.js";
import { strToU8, zip as fflateZip } from "fflate";

export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // Replace block-level elements with newlines before stripping
  for (const element of Array.from(doc.querySelectorAll("p, br, h1, h2, h3, h4, h5, h6, hr, li"))) {
    element.insertAdjacentText("afterend", element.tagName === "BR" ? "\n" : "\n\n");
  }
  const text = doc.body.textContent ?? "";
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

export function htmlToMarkdown(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return nodeToMarkdown(doc.body).replace(/\n{3,}/g, "\n\n").trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? "";
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  const inner = Array.from(element.childNodes).map(nodeToMarkdown).join("");

  switch (tag) {
    case "p": return `\n\n${inner}\n\n`;
    case "br": return "\n";
    case "hr": return "\n\n---\n\n";
    case "em":
    case "i": return `*${inner}*`;
    case "strong":
    case "b": return `**${inner}**`;
    case "s":
    case "del": return `~~${inner}~~`;
    case "blockquote": return `\n\n> ${inner.trim().replace(/\n/g, "\n> ")}\n\n`;
    case "h1": return `\n\n# ${inner}\n\n`;
    case "h2": return `\n\n## ${inner}\n\n`;
    case "h3": return `\n\n### ${inner}\n\n`;
    case "h4": return `\n\n#### ${inner}\n\n`;
    case "h5": return `\n\n##### ${inner}\n\n`;
    case "h6": return `\n\n###### ${inner}\n\n`;
    case "ul": return `\n\n${Array.from(element.children).map((child) => `- ${nodeToMarkdown(child).trim()}`).join("\n")}\n\n`;
    case "ol": return `\n\n${Array.from(element.children).map((child, index) => `${index + 1}. ${nodeToMarkdown(child).trim()}`).join("\n")}\n\n`;
    case "li": return inner;
    case "a": {
      const href = element.getAttribute("href");
      return href ? `[${inner}](${href})` : inner;
    }
    case "img": {
      const src = element.getAttribute("src") ?? "";
      const alt = element.getAttribute("alt") ?? "";
      return `![${alt}](${src})`;
    }
    default: return inner;
  }
}

export function zipFiles(files: Record<string, Uint8Array | string>): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const input: Record<string, Uint8Array> = {};
    for (const [path, content] of Object.entries(files)) {
      input[path] = typeof content === "string" ? strToU8(content) : content;
    }
    fflateZip(input, (error, data) => {
      if (error) reject(error);
      else resolve(new Blob([data.buffer as ArrayBuffer], { type: "application/zip" }));
    });
  });
}

export async function fetchCoverImage(
  coverImageUrl: string | null,
): Promise<{ data: Uint8Array; extension: string } | null> {
  if (!coverImageUrl) return null;
  try {
    const response = await fetch(coverImageUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() ?? "image/jpeg";
    const extension = mimeType === "image/jpeg" ? "jpg" : (mimeType.split("/")[1] ?? "jpg");
    return { data: new Uint8Array(buffer), extension };
  } catch {
    return null;
  }
}

export function formatFilename(template: string, data: FicData): string {
  const now = new Date();
  const pad = (value: number): string => String(value).padStart(2, "0");
  const dateStr = (date: Date): string =>
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

  return template
    .replace(/\{title\}/g, data.core.title)
    .replace(/\{author\}/g, data.core.author)
    .replace(/\{currentDate\}/g, dateStr(now))
    .replace(/\{publishDate\}/g, data.core.publishDate ? dateStr(data.core.publishDate) : "")
    .replace(/\{updateDate\}/g, data.core.updateDate ? dateStr(data.core.updateDate) : "")
    .replace(/[<>:"/\\|?*]/g, "_")
    .trim();
}
