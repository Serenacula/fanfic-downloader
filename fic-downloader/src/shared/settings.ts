import type { SiteId, FicData } from "./types.js";

export type DownloadFormat = "epub" | "pdf" | "docx" | "html" | "markdown" | "txt";

export type FilenameTemplateVar = "title" | "author" | "currentDate" | "publishDate" | "updateDate";

export interface StoryInfoFieldConfig {
  show: boolean;
}

export type StoryInfoFields = Partial<Record<string, StoryInfoFieldConfig>>;

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
  filenameTemplate: string;
  storyInfoFields: Partial<Record<SiteId, StoryInfoFields>>;
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
  filenameTemplate: "{title} - {author}",
  storyInfoFields: {},
};

export type RendererFn = (data: FicData, settings: Settings) => Promise<Blob>;

const STORAGE_KEY = "settings";

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  const stored = result[STORAGE_KEY];
  if (stored == null || typeof stored !== "object") {
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...(stored as Partial<Settings>) };
}

export async function saveSettings(patch: Partial<Omit<Settings, "version">>): Promise<void> {
  const current = await getSettings();
  await browser.storage.local.set({ [STORAGE_KEY]: { ...current, ...patch } });
}
