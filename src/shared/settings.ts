import type { FicData } from "./types.js";

export type DownloadFormat = "epub" | "pdf" | "docx" | "html" | "markdown" | "txt";

export type FilenameTemplateVar = "title" | "author" | "currentDate" | "publishDate" | "updateDate";


export interface Settings {
  version: 1;
  format: DownloadFormat;
  includeImages: boolean;
  includeCoverImage: boolean;
  includeCoverPage: boolean;
  includeToc: boolean;
  includeAuthorNotes: boolean;
  chapterSplit: boolean;
  includeChapterTitles: boolean;
  confirmationDialogue: boolean;
  rateLimitMs: number;
  maxConcurrentDownloads: number;
  filenameTemplate: string;
  storyInfoFields: Partial<Record<string, boolean>>;
  debugLogging: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  format: "epub",
  includeImages: true,
  includeCoverImage: true,
  includeCoverPage: true,
  includeToc: true,
  includeAuthorNotes: false,
  chapterSplit: false,
  includeChapterTitles: true,
  confirmationDialogue: false,
  rateLimitMs: 500,
  maxConcurrentDownloads: 3,
  filenameTemplate: "{title} - {author}",
  storyInfoFields: {},
  debugLogging: false,
};

export const MIN_RATE_LIMIT_MS = 200;
export const MAX_RATE_LIMIT_MS = 10_000;
export const MIN_MAX_CONCURRENT = 1;
export const MAX_MAX_CONCURRENT = 8;

// A rate limit below this floor (and unlimited concurrency, see
// clampMaxConcurrent) is how users get themselves Cloudflare-banned.
export function clampRateLimitMs(value: number): number {
  if (isNaN(value)) return DEFAULT_SETTINGS.rateLimitMs;
  return Math.min(Math.max(MIN_RATE_LIMIT_MS, value), MAX_RATE_LIMIT_MS);
}

export function clampMaxConcurrent(value: number): number {
  if (isNaN(value)) return DEFAULT_SETTINGS.maxConcurrentDownloads;
  return Math.min(Math.max(MIN_MAX_CONCURRENT, value), MAX_MAX_CONCURRENT);
}

export type RendererFn = (data: FicData, settings: Settings) => Promise<Blob>;

const STORAGE_KEY = "settings";

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];
  const merged =
    stored == null || typeof stored !== "object"
      ? { ...DEFAULT_SETTINGS }
      : { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
  return {
    ...merged,
    rateLimitMs: clampRateLimitMs(merged.rateLimitMs),
    maxConcurrentDownloads: clampMaxConcurrent(merged.maxConcurrentDownloads),
  };
}

export async function saveSettings(patch: Partial<Omit<Settings, "version">>): Promise<void> {
  const current = await getSettings();
  await browser.storage.local.set({ [STORAGE_KEY]: { ...current, ...patch } });
}
