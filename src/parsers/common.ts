import type { FicData, FicImage } from "../shared/types.js";
import type { Settings } from "../shared/settings.js";
import { enqueue } from "../background/request-queue.js";

export interface Parser {
  pattern: RegExp;
  parse: (url: string, settings: Settings) => Promise<FicData>;
}

const ALLOWED_TAGS = new Set([
  "p", "em", "strong", "b", "i", "br", "hr", "blockquote",
  "img", "a", "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li", "div", "span", "s", "del", "u", "sup", "sub",
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(["href", "title"]),
  img: new Set(["src", "alt", "title", "width", "height"]),
};

export function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  sanitizeNode(doc.body);
  return doc.body.innerHTML;
}

function sanitizeNode(node: Node): void {
  const toRemove: Node[] = [];

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) continue;
    if (child.nodeType !== Node.ELEMENT_NODE) {
      toRemove.push(child);
      continue;
    }

    const element = child as Element;
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      // Unwrap: keep children, remove the element itself
      while (element.firstChild) {
        node.insertBefore(element.firstChild, element);
      }
      toRemove.push(element);
      continue;
    }

    // Remove disallowed attributes
    const allowedForTag = ALLOWED_ATTRS[tagName] ?? new Set<string>();
    for (const attr of Array.from(element.attributes)) {
      if (!allowedForTag.has(attr.name) || attr.name.startsWith("on")) {
        element.removeAttribute(attr.name);
      }
    }

    // Strip inline base64 images (pre-compressed, bloat EPUB XHTML enormously); remove element if no src remains
    if (tagName === "img") {
      if (element.getAttribute("src")?.startsWith("data:")) {
        toRemove.push(element);
        continue;
      }
      if (!element.getAttribute("src")) {
        toRemove.push(element);
        continue;
      }
    }

    // Strip dangerous href schemes (javascript:, data:, vbscript:, etc.)
    if (tagName === "a") {
      const href = element.getAttribute("href");
      if (href && !/^(https?:|\/|#)/i.test(href)) {
        element.removeAttribute("href");
      }
    }

    sanitizeNode(element);
  }

  for (const node_ of toRemove) {
    node.removeChild(node_);
  }
}

export async function fetchHtml(url: string): Promise<Document> {
  const response = await enqueue(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }
  const text = await response.text();
  return new DOMParser().parseFromString(text, "text/html");
}

export async function fetchImages(urls: string[]): Promise<FicImage[]> {
  const results = await Promise.allSettled(
    urls.map(async (url): Promise<FicImage> => {
      const response = await enqueue(url);
      if (!response.ok) throw new Error(`Image fetch failed: ${url}`);
      const data = await response.arrayBuffer();
      const mimeType = response.headers.get("content-type") ?? "image/jpeg";
      return { url, mimeType: mimeType.split(";")[0]?.trim() ?? "image/jpeg", data };
    }),
  );
  return results
    .filter((result): result is PromiseFulfilledResult<FicImage> => result.status === "fulfilled")
    .map((result) => result.value);
}

export function textContent(element: Element | null): string {
  return element?.textContent?.trim() ?? "";
}

export function parseCount(text: string): number | null {
  const cleaned = text.replace(/,/g, "").trim();
  const value = parseInt(cleaned, 10);
  return isNaN(value) ? null : value;
}

export function ogImage(doc: Document): string | null {
  return doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ?? null;
}

export function parseDate(text: string): Date | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const date = new Date(trimmed);
  return isNaN(date.getTime()) ? null : date;
}

export function resolveImageSrcs(html: string, baseUrl: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const base = new URL(baseUrl);
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("http") || src.startsWith("data:")) continue;
    try {
      img.setAttribute("src", new URL(src, base).href);
    } catch {
      // Ignore unresolvable URLs
    }
  }
  return doc.body.innerHTML;
}

export function collectImageUrls(html: string, baseUrl: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const base = new URL(baseUrl);
  const urls: string[] = [];
  for (const img of Array.from(doc.querySelectorAll("img"))) {
    const src = img.getAttribute("src");
    if (!src || src.startsWith("data:")) continue;
    try {
      urls.push(new URL(src, base).href);
    } catch {
      // Ignore invalid URLs
    }
  }
  return urls;
}
